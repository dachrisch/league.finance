import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Types } from 'mongoose';
import { router, protectedProcedure, adminProcedure } from '../../trpc';
import { UpdateOfferSchema, OfferLetterSchema, OfferLineSchema } from '../../../../shared/schemas/offer';
import { UpdateFinancialConfigSchema } from '../../../../shared/schemas/financialConfig';
import { Offer } from '../../models/Offer';
import { FinancialConfig } from '../../models/FinancialConfig';
import { Contact } from '../../models/Contact';
import { getMysqlPool } from '../../db/mysql';
import { supportsTransactions } from '../../db/mongo';
import { extractContactInfo } from '../../../../shared/lib/extraction';
import { computeConfigPrices } from '../../lib/configPricing';
import { offerLinesTotal, linesFromConfigs, validateOfferLines } from '../../../../shared/lib/offerLines';
import { generateOfferNumber } from '../../lib/offerNumbering';
import { fetchLeaguesMap } from '../../lib/leagueNames';
import { buildOfferPdfData } from '../../lib/offerPdfData';
import { PdfService } from '../../services/PdfService';

const normalizeOffer = (doc: any) => {
  const obj = doc.toObject?.() || doc;
  
  // Handle potentially populated fields
  const normalizeId = (val: any) => {
    if (!val) return val;
    if (typeof val === 'object' && val._id) return val._id.toString();
    return val.toString();
  };

  return {
    ...obj,
    _id: obj._id?.toString(),
    associationId: normalizeId(obj.associationId),
    contactId: normalizeId(obj.contactId),
  };
};

const normalizeConfig = (doc: any) => ({
  ...(doc.toObject?.() || doc),
  _id: doc._id?.toString(),
  offerId: doc.offerId?.toString?.() || doc.offerId,
});

const normalizeContact = (doc: any) => ({
  ...doc,
  _id: doc._id?.toString(),
});

const loadDraft = async (id: string) => {
  const offer = await Offer.findById(id);
  if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });
  if (offer.status !== 'draft') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only draft offers can be edited.' });
  }
  return offer;
};
const DAY_MS = 24 * 60 * 60 * 1000;

export const offersRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['draft', 'sending', 'sent', 'accepted', 'rejected']).optional(),
        associationId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const query: any = {};
      if (input?.status) query.status = input.status;
      if (input?.associationId) query.associationId = input.associationId;

      const offers = await Offer.find(query)
        .populate('contactId', 'name address')
        .sort({ createdAt: -1 })
        .lean();

      // Compute each offer's pricing from its FinancialConfigs. The Offer document
      // itself carries no price; pricing lives in FinancialConfig records.
      const offerIds = offers.map((o: any) => o._id);
      const configs = await FinancialConfig.find({ offerId: { $in: offerIds } }).lean();

      const totalByOfferId: Record<string, number> = {};
      const leaguePricesByOfferId: Record<string, Array<{ leagueId: number; finalPrice: number }>> = {};
      for (const config of configs as any[]) {
        const { finalPrice } = computeConfigPrices(config);
        const key = config.offerId?.toString?.() || config.offerId;
        totalByOfferId[key] = (totalByOfferId[key] || 0) + finalPrice;
        (leaguePricesByOfferId[key] ||= []).push({ leagueId: config.leagueId, finalPrice });
      }

      return offers.map((offer: any) => ({
        ...normalizeOffer(offer),
        totalPrice: offer.lines?.length ? offerLinesTotal(offer.lines) : (totalByOfferId[offer._id?.toString()] || 0),
        leaguePrices: leaguePricesByOfferId[offer._id?.toString()] || [],
      }));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const offer = await Offer.findById(input.id)
        .populate('contactId')
        .lean();

      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });

      // Get all configs for this offer
      const configs = await FinancialConfig.find({ offerId: input.id }).lean();

      // Fetch league data from MySQL to get league names
      const leaguesMap = await fetchLeaguesMap();

      const pricedConfigs = configs.map((config) => computeConfigPrices(config, leaguesMap[config.leagueId] || 'Unknown League'));

      return {
        offer: normalizeOffer(offer),
        contact: (offer as any).contactId,
        configs: pricedConfigs,
        totalPrice: (offer as any).lines?.length
          ? offerLinesTotal((offer as any).lines)
          : pricedConfigs.reduce((s, c) => s + c.finalPrice, 0),
      };
    }),

  extractContact: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      const result = extractContactInfo(input.text);

      // Simple duplicate detection (simulated)
      const duplicates = {
        type: 'none' as const,
        associationMatches: [] as any[],
        contactMatches: [] as any[]
      };

      return {
        data: {
          organizationName: result.organizationName || 'Extracted Organization',
          contactName: result.contactName || 'Extracted Contact',
          email: result.email || '',
          phone: result.phone || '',
          street: result.street || '',
          city: result.city || '',
          postalCode: result.postalCode || '',
          country: result.country || 'Germany'
        },
        duplicates
      };
    }),

  create: protectedProcedure
    .input(z.object({
      associationId: z.string().min(1),
      contactId: z.string().min(1),
      seasonId: z.number().int().positive(),
      leagueIds: z.array(z.number().int().positive()).min(1),
      costModel: z.enum(['flatFee', 'perGameDay']),
      baseRateOverride: z.number().positive().nullable().optional(),
      expectedTeamsCount: z.number().int().min(0),
    }))
    .mutation(async ({ input }) => {
      const session = supportsTransactions() ? await Offer.startSession() : null;
      if (session) await session.startTransaction();

      try {
        // Map costModel
        const costModel = input.costModel === 'flatFee' ? 'SEASON' : 'GAMEDAY';

        // Create offer
        const [offer] = await Offer.create(
          [{
            status: 'draft',
            associationId: input.associationId,
            seasonId: input.seasonId,
            leagueIds: input.leagueIds,
            contactId: new Types.ObjectId(input.contactId),
          }],
          session ? { session } : {}
        );

        // Create FinancialConfig for each league
        const configs = await FinancialConfig.insertMany(
          input.leagueIds.map((leagueId) => ({
            leagueId,
            seasonId: input.seasonId,
            costModel,
            baseRateOverride: input.baseRateOverride ?? null,
            expectedTeamsCount: input.expectedTeamsCount,
            expectedGamedaysCount: 0,
            expectedTeamsPerGameday: 0,
            offerId: offer._id,
          })),
          session ? { session } : {}
        );

        if (session) await session.commitTransaction();

        return {
          ...normalizeOffer(offer),
          configs: configs.map(normalizeConfig),
        };
      } catch (err: any) {
        if (session) await session.abortTransaction();
        if (err.code === 11000) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An offer for this association/season already exists.',
          });
        }
        throw err;
      } finally {
        if (session) await session.endSession();
      }
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string(),
      data: UpdateOfferSchema.extend({
        associationId: z.string().optional(),
        seasonId: z.number().int().positive().optional(),
        costModel: z.enum(['flatFee', 'perGameDay']).optional(),
        baseRateOverride: z.number().positive().nullable().optional(),
        expectedTeamsCount: z.number().int().min(0).optional(),
      })
    }))
    .mutation(async ({ input }) => {
      const offer = await Offer.findById(input.id);
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });

      if (offer.status !== 'draft') {
        // Only allow status updates if not draft
        if (input.data.status) offer.status = input.data.status;
        if (input.data.sentAt) offer.sentAt = input.data.sentAt;
        if (input.data.acceptedAt) offer.acceptedAt = input.data.acceptedAt;
        await offer.save();
        return normalizeOffer(offer);
      }

      // FULL EDIT FOR DRAFTS
      if (input.data.status) offer.status = input.data.status;
      if (input.data.contactId) offer.contactId = input.data.contactId as any;
      if (input.data.associationId) offer.associationId = input.data.associationId;
      if (input.data.seasonId) offer.seasonId = input.data.seasonId;
      
      const newLeagueIds = input.data.leagueIds || offer.leagueIds;
      const seasonId = input.data.seasonId || offer.seasonId;
      const costModel = input.data.costModel === 'perGameDay' ? 'GAMEDAY' : 'SEASON';

      // Always refresh configs for draft to ensure they match current pricing settings
      // Simple strategy: delete and recreate if leagues or pricing settings changed
      if (input.data.leagueIds || input.data.costModel || input.data.baseRateOverride !== undefined || input.data.expectedTeamsCount !== undefined || input.data.seasonId) {
        await FinancialConfig.deleteMany({ offerId: offer._id });
        
        await FinancialConfig.insertMany(
          newLeagueIds.map((leagueId) => ({
            leagueId,
            seasonId,
            costModel,
            baseRateOverride: input.data.baseRateOverride !== undefined ? input.data.baseRateOverride : null,
            expectedTeamsCount: input.data.expectedTeamsCount ?? 0,
            expectedGamedaysCount: 0,
            expectedTeamsPerGameday: 0,
            offerId: offer._id,
          }))
        );
        
        offer.leagueIds = newLeagueIds;
      }

      await offer.save();

      const configs = await FinancialConfig.find({ offerId: offer._id }).lean();
      const contact = await Contact.findById(offer.contactId).lean();

      return {
        ...normalizeOffer(offer),
        contact: contact ? normalizeContact(contact) : undefined,
        configs: configs.map(normalizeConfig),
      };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const offer = await Offer.findById(input.id);
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });

      if (offer.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft offers can be deleted.',
        });
      }

      // Delete all associated configs
      await FinancialConfig.deleteMany({ offerId: offer._id });

      // Delete offer
      await Offer.findByIdAndDelete(input.id);

      return { success: true };
    }),

  markSent: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const offer = await Offer.findByIdAndUpdate(
        input.id,
        { status: 'sent', sentAt: new Date() },
        { returnDocument: 'after' }
      ).lean();

      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });
      return normalizeOffer(offer);
    }),

  markAccepted: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const offer = await Offer.findByIdAndUpdate(
        input.id,
        { status: 'accepted', acceptedAt: new Date() },
        { returnDocument: 'after' }
      ).lean();

      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });
      return normalizeOffer(offer);
    }),

  markRejected: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const offer = await Offer.findByIdAndUpdate(
        input.id,
        { status: 'rejected' },
        { returnDocument: 'after' }
      ).lean();

      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });
      return normalizeOffer(offer);
    }),

  updateConfig: adminProcedure
    .input(UpdateFinancialConfigSchema)
    .mutation(async ({ input }) => {
      const config = await FinancialConfig.findById(input.configId);
      if (!config) throw new TRPCError({ code: 'NOT_FOUND', message: 'Configuration not found' });

      config.customPrice = input.customPrice;
      await config.save();

      // Get league name from MySQL for normalization
      let leagueName = 'Unknown League';
      try {
        const pool = getMysqlPool();
        const [rows] = await pool.query<any[]>('SELECT name FROM gamedays_league WHERE id = ?', [config.leagueId]);
        if (rows && rows.length > 0) {
          leagueName = rows[0].name;
        }
      } catch (err) {
        console.error('Failed to fetch league name:', err);
      }

      return computeConfigPrices(config.toObject(), leagueName);
    }),

  setLines: adminProcedure
    .input(z.object({ id: z.string(), lines: z.array(OfferLineSchema) }))
    .mutation(async ({ input }) => {
      const offer = await loadDraft(input.id);
      const invalid = validateOfferLines(input.lines);
      if (invalid) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Zeile ${invalid.index + 1}: ${invalid.message}` });
      }
      offer.lines = input.lines;
      await offer.save();
      return normalizeOffer(offer);
    }),

  generateLines: adminProcedure
    .input(z.object({ id: z.string(), overwrite: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const offer = await loadDraft(input.id);
      if (offer.lines?.length && !input.overwrite) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Offer already has price lines.' });
      }
      const configs = await FinancialConfig.find({ offerId: offer._id }).lean();
      const leaguesMap = await fetchLeaguesMap(configs.map((c) => c.leagueId));
      offer.lines = linesFromConfigs(configs.map((c) => computeConfigPrices(c)), leaguesMap);
      await offer.save();
      return normalizeOffer(offer);
    }),

  updateLetter: adminProcedure
    .input(z.object({ id: z.string(), data: OfferLetterSchema.extend({ assignNumber: z.boolean().optional() }) }))
    .mutation(async ({ input }) => {
      const offer = await loadDraft(input.id);
      const { assignNumber, ...data } = input.data;
      Object.assign(offer, data);
      if (!offer.offerDate) offer.offerDate = new Date();
      if (assignNumber && !offer.offerNumber) offer.offerNumber = await generateOfferNumber(offer.offerDate);
      if (!offer.validUntil) offer.validUntil = new Date(offer.offerDate.getTime() + 30 * DAY_MS);
      try {
        await offer.save();
      } catch (err: any) {
        if (err.code === 11000) {
          throw new TRPCError({ code: 'CONFLICT', message: `Angebotsnummer ${offer.offerNumber} ist bereits vergeben.` });
        }
        throw err;
      }
      return normalizeOffer(offer);
    }),

  /** Renders the offer letter for preview (admin only); does not change the offer's status. */
  previewPdf: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const exists = await Offer.exists({ _id: input.id });
      if (!exists) throw new TRPCError({ code: 'NOT_FOUND', message: 'Offer not found' });
      const data = await buildOfferPdfData(input.id);
      const pdf = await PdfService.generateOfferPdf(data);
      return { filename: PdfService.generateFilename(data.offerNumber, data.seasonName), base64: pdf.toString('base64') };
    }),
});
