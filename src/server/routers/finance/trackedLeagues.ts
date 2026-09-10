import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { RowDataPacket } from 'mysql2';
import { router, protectedProcedure } from '../../trpc';
import { CreateTrackedLeagueSchema, UpdateTrackedLeagueSchema } from '../../../../shared/schemas/trackedLeague';
import { TrackedLeague } from '../../models/TrackedLeague';
import { Association } from '../../models/Association';
import { Offer } from '../../models/Offer';
import { Invoice } from '../../models/Invoice';
import { getMysqlPool } from '../../db/mysql';
import { computeTrackedLeagueEffectiveStatus } from '../../lib/trackedLeagueStatus';
import { matchLeaguesphereCandidates, type CrosscheckCandidate } from '../../lib/trackedLeagueCrosscheck';

const normalizeTrackedLeague = (doc: any) => ({
  ...doc,
  _id: doc._id.toString(),
  contactId: doc.contactId ? doc.contactId.toString() : null,
  linkedOfferId: doc.linkedOfferId ? doc.linkedOfferId.toString() : null,
});

export const trackedLeaguesRouter = router({
  list: protectedProcedure
    .input(z.object({ associationId: z.string() }))
    .query(async ({ input }) => {
      const trackedLeagues = await TrackedLeague.find({ associationId: input.associationId })
        .sort({ year: -1, name: 1 })
        .lean();

      const offerIds = trackedLeagues
        .map((tl) => tl.linkedOfferId?.toString())
        .filter((id): id is string => !!id);

      const offers = offerIds.length > 0 ? await Offer.find({ _id: { $in: offerIds } }).lean() : [];
      const offersById = new Map(offers.map((o) => [o._id.toString(), o]));

      const invoices = offerIds.length > 0 ? await Invoice.find({ offerId: { $in: offerIds } }).lean() : [];
      const invoicesByOfferId = new Map(invoices.map((i) => [i.offerId.toString(), i]));

      return trackedLeagues.map((tl) => {
        const normalized = normalizeTrackedLeague(tl);
        const offer = normalized.linkedOfferId ? offersById.get(normalized.linkedOfferId) : undefined;
        const invoice = offer ? invoicesByOfferId.get(offer._id.toString()) : undefined;
        return {
          ...normalized,
          effectiveStatus: computeTrackedLeagueEffectiveStatus(normalized, offer, invoice),
        };
      });
    }),

  create: protectedProcedure
    .input(CreateTrackedLeagueSchema)
    .mutation(async ({ input }) => {
      const created = await TrackedLeague.create(input);
      return normalizeTrackedLeague(created.toObject());
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: UpdateTrackedLeagueSchema }))
    .mutation(async ({ input }) => {
      const updated = await TrackedLeague.findByIdAndUpdate(input.id, input.data, { returnDocument: 'after' }).lean();
      if (!updated) throw new TRPCError({ code: 'NOT_FOUND' });
      return normalizeTrackedLeague(updated);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const deleted = await TrackedLeague.findByIdAndDelete(input.id);
      if (!deleted) throw new TRPCError({ code: 'NOT_FOUND' });
      return { success: true };
    }),

  crosscheck: protectedProcedure
    .input(z.object({ associationId: z.string(), years: z.array(z.number()).min(1) }))
    .query(async ({ input }) => {
      const unlinked = await TrackedLeague.find({
        associationId: input.associationId,
        year: { $in: input.years },
        leaguesphereLeagueId: null,
      }).lean();

      if (unlinked.length === 0) return {};

      const pool = getMysqlPool();
      const association = await Association.findById(input.associationId).lean();
      const result: Record<string, CrosscheckCandidate[]> = {};

      for (const year of input.years) {
        const forYear = unlinked.filter((tl) => tl.year === year);
        if (forYear.length === 0) continue;

        const [seasonRows] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM gamedays_season WHERE name = ?',
          [String(year)]
        );
        const season = seasonRows[0];
        if (!season) continue;

        const params: number[] = [season.id];
        let joinClause = '';
        let whereClause = 'WHERE slt.season_id = ?';
        if (association?.leaguesphereAssociationId != null) {
          joinClause = `
           JOIN gamedays_seasonleagueteam_teams st ON st.seasonleagueteam_id = slt.id
           JOIN gamedays_team t ON t.id = st.team_id`;
          whereClause += " AND t.association_id = ? AND t.location != 'dummy'";
          params.push(association.leaguesphereAssociationId);
        }

        const [leagueRows] = await pool.query<RowDataPacket[]>(
          `SELECT DISTINCT l.id as _id, l.name
           FROM gamedays_league l
           JOIN gamedays_seasonleagueteam slt ON slt.league_id = l.id
           ${joinClause}
           ${whereClause}`,
          params
        );

        for (const tl of forYear) {
          const candidates = matchLeaguesphereCandidates(tl.name, leagueRows as unknown as { _id: number; name: string }[]);
          if (candidates.length > 0) result[tl._id.toString()] = candidates;
        }
      }

      return result;
    }),

  linkToOffer: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1), offerId: z.string() }))
    .mutation(async ({ input }) => {
      await TrackedLeague.updateMany(
        { _id: { $in: input.ids } },
        { $set: { linkedOfferId: input.offerId } }
      );
      return { success: true };
    }),
});
