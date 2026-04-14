import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../../trpc';
import { CreateOfferSchema, UpdateOfferSchema } from '../../../../shared/schemas/offer';
import { UpdateFinancialConfigSchema } from '../../../../shared/schemas/financialConfig';
import { Offer } from '../../models/Offer';
import { FinancialConfig } from '../../models/FinancialConfig';
import { Contact } from '../../models/Contact';
import { getMysqlPool } from '../../db/mysql';

const DEFAULT_BASE_RATE = 50;

const normalizeOffer = (doc: any) => ({
  ...doc.toObject?.() || doc,
  _id: doc._id?.toString(),
  contactId: doc.contactId?.toString?.() || doc.contactId,
});

const normalizeConfig = (doc: any) => ({
  ...doc,
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
    customPrice: config.customPrice || null,
    finalPrice: config.customPrice ? config.customPrice : Math.round(basePrice * 100) / 100,
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

  create: adminProcedure
    .input(CreateOfferSchema.extend({
      costModel: z.enum(['SEASON', 'GAMEDAY']),
      baseRateOverride: z.number().positive().nullable().optional(),
      expectedTeamsCount: z.number().int().min(1),
      expectedGamedaysCount: z.number().int().min(0).optional(),
      expectedTeamsPerGameday: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Create offer
        const offer = await Offer.create({
          status: 'draft',
          associationId: input.associationId,
          seasonId: input.seasonId,
          leagueIds: input.leagueIds,
          contactId: input.contactId,
        });

        // Auto-create FinancialConfig for each league
        const configs = await Promise.all(
          input.leagueIds.map((leagueId) =>
            FinancialConfig.create({
              leagueId,
              seasonId: input.seasonId,
              costModel: input.costModel,
              baseRateOverride: input.baseRateOverride ?? null,
              expectedTeamsCount: input.expectedTeamsCount,
              expectedGamedaysCount: input.expectedGamedaysCount ?? 0,
              expectedTeamsPerGameday: input.expectedTeamsPerGameday ?? 0,
              offerId: offer._id,
            })
          )
        );

        return {
          ...normalizeOffer(offer),
          configs: configs.map(normalizeConfig),
        };
      } catch (err: any) {
        if (err.code === 11000) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An offer for this association/season already exists in draft or sent state.',
          });
        }
        throw err;
      }
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string(),
      data: UpdateOfferSchema.extend({
        costModel: z.enum(['SEASON', 'GAMEDAY']).optional(),
        baseRateOverride: z.number().positive().nullable().optional(),
        expectedTeamsCount: z.number().int().min(1).optional(),
      })
    }))
    .mutation(async ({ input }) => {
      const offer = await Offer.findById(input.id);
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });

      // Update allowed fields
      if (input.data.status) offer.status = input.data.status;
      if (input.data.sentAt) offer.sentAt = input.data.sentAt;
      if (input.data.acceptedAt) offer.acceptedAt = input.data.acceptedAt;
      if (input.data.contactId) offer.contactId = input.data.contactId as any;

      // If leagues changed, update configs
      if (input.data.leagueIds) {
        const oldLeagueIds = offer.leagueIds;
        const removedLeagueIds = oldLeagueIds.filter(
          (id) => !input.data.leagueIds!.includes(id)
        );
        const newLeagueIds = input.data.leagueIds.filter(
          (id) => !oldLeagueIds.includes(id)
        );

        if (removedLeagueIds.length > 0) {
          await FinancialConfig.deleteMany({
            offerId: offer._id,
            leagueId: { $in: removedLeagueIds },
          });
        }

        if (newLeagueIds.length > 0) {
          await Promise.all(
            newLeagueIds.map((leagueId) =>
              FinancialConfig.create({
                leagueId,
                seasonId: offer.seasonId,
                costModel: 'SEASON',
                baseRateOverride: null,
                expectedTeamsCount: 15,
                offerId: offer._id,
              })
            )
          );
        }

        offer.leagueIds = input.data.leagueIds;
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

  updateConfig: protectedProcedure
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

      return computeConfigPrices(config, leagueName);
    }),
});
