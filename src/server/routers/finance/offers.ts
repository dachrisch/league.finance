import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Types } from 'mongoose';
import { router, protectedProcedure, adminProcedure } from '../../trpc';
import { CreateOfferSchema, UpdateOfferSchema } from '../../../../shared/schemas/offer';
import { UpdateFinancialConfigSchema } from '../../../../shared/schemas/financialConfig';
import { Offer } from '../../models/Offer';
import { FinancialConfig } from '../../models/FinancialConfig';
import { Contact } from '../../models/Contact';
import { getMysqlPool } from '../../db/mysql';
import { supportsTransactions } from '../../db/mongo';
import { extractContactInfo } from '../../../../shared/lib/extraction';
import { offerSendQueue } from '../../jobs/queue';

const DEFAULT_BASE_RATE = 50;

const normalizeOffer = (doc: any) => ({
  ...doc.toObject?.() || doc,
  _id: doc._id?.toString(),
  associationId: doc.associationId?.toString() || doc.associationId,
  contactId: doc.contactId?.toString?.() || doc.contactId,
});

const normalizeConfig = (doc: any) => ({
  ...(doc.toObject?.() || doc),
  _id: doc._id?.toString(),
  offerId: doc.offerId?.toString?.() || doc.offerId,
});

const normalizeContact = (doc: any) => ({
  ...doc,
  _id: doc._id?.toString(),
});

const computeConfigPrices = (config: any, leagueName: string = 'Unknown League') => {
  const baseRate = config.baseRateOverride ?? DEFAULT_BASE_RATE;
  const basePrice = config.costModel === 'SEASON'
    ? baseRate * config.expectedTeamsCount
    : baseRate * config.expectedGamedaysCount * config.expectedTeamsPerGameday;

  return {
    ...config,
    basePrice: Math.round(basePrice * 100) / 100,
    customPrice: config.customPrice ?? null,
    finalPrice: config.customPrice != null ? config.customPrice : Math.round(basePrice * 100) / 100,
    leagueName: leagueName,
  };
};

export const offersRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['draft', 'sent', 'accepted']).optional(),
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

      return offers.map(normalizeOffer);
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
      let leaguesMap: Record<number, string> = {};
      try {
        const pool = getMysqlPool();
        const [rows] = await pool.query<any[]>('SELECT id, name FROM gamedays_league');
        leaguesMap = rows.reduce((acc, row) => {
          acc[row.id] = row.name;
          return acc;
        }, {});
      } catch (err) {
        console.error('Failed to fetch leagues:', err);
      }

      return {
        offer: normalizeOffer(offer),
        contact: (offer as any).contactId,
        configs: configs.map((config) => computeConfigPrices(config, leaguesMap[config.leagueId] || 'Unknown League'))
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

  sendOffer: adminProcedure
    .input(z.object({
      offerId: z.string(),
      driveFolderId: z.string(),
      recipientEmail: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      const offer = await Offer.findById(input.offerId);
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });
      if (offer.status === 'sent') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Offer already sent' });

      const job = await offerSendQueue.add({
        offerId: input.offerId,
        userId: ctx.user.userId,
        driveFolderId: input.driveFolderId,
        recipientEmail: input.recipientEmail,
      });

      return {
        jobId: job.id,
        status: 'queued',
      };
    }),

  getOfferSendStatus: adminProcedure
    .input(z.object({ offerId: z.string() }))
    .query(async ({ input }) => {
      const offer = await Offer.findById(input.offerId).lean();
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });

      if (offer.status === 'sent') {
        return {
          status: 'completed' as const,
          progress: 100,
          driveLink: offer.emailMetadata?.driveLink,
          completedAt: offer.sentAt,
          error: undefined,
        };
      }

      if (!offer.sendJobId) {
        return { status: 'none' as const, progress: 0, error: undefined };
      }

      const job = await offerSendQueue.getJob(offer.sendJobId);
      if (!job) {
        // If job is gone but offer status is not 'sent', it must have failed or was cleaned up
        return {
          status: offer.emailMetadata?.failureReason ? 'failed' as const : 'none' as const,
          progress: 0,
          error: offer.emailMetadata?.failureReason,
        };
      }

      const state = await job.getState();
      let status: 'pending' | 'generating-pdf' | 'uploading' | 'sending-email' | 'completed' | 'failed' = 'pending';
      const progress = job.progress() as number;

      if (state === 'failed') status = 'failed';
      else if (state === 'completed') status = 'completed';
      else if (progress >= 90) status = 'sending-email';
      else if (progress >= 50) status = 'uploading';
      else if (progress >= 20) status = 'generating-pdf';

      return {
        jobId: job.id,
        status,
        progress,
        error: job.failedReason,
      };
    }),

  retryOfferSend: adminProcedure
    .input(z.object({ offerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const offer = await Offer.findById(input.offerId);
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });
      if (offer.status === 'sent') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Offer already sent' });
      
      if (!offer.emailMetadata?.driveFolderId || !offer.emailMetadata?.recipientEmail) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing previous send attempt data' });
      }

      const job = await offerSendQueue.add({
        offerId: input.offerId,
        userId: ctx.user.userId,
        driveFolderId: offer.emailMetadata.driveFolderId,
        recipientEmail: offer.emailMetadata.recipientEmail,
      });

      return {
        jobId: job.id,
        status: 'queued',
      };
    }),
});
