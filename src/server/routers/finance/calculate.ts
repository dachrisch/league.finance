import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../../trpc';
import { FinancialConfig } from '../../models/FinancialConfig';
import { Discount } from '../../models/Discount';
import { getOrCreateSettings } from '../../models/FinancialSettings';
import { getMysqlPool } from '../../db/mysql';
import { calculateCosts } from '../../lib/financeCalculator';
import type { RowDataPacket } from 'mysql2';

export const calculateRouter = router({
  forConfig: protectedProcedure
    .input(z.object({ configId: z.string() }))
    .query(async ({ input }) => {
      const pool = getMysqlPool();
      const config = await FinancialConfig.findById(input.configId).lean();
      if (!config) throw new TRPCError({ code: 'NOT_FOUND' });

      const settings = await getOrCreateSettings();
      const discounts = await Discount.find({ configId: input.configId }).lean();
      const discountInputs = discounts.map((d) => ({ type: d.type, value: d.value }));

      const baseRate =
        config.baseRateOverride ??
        (config.costModel === 'SEASON'
          ? settings.defaultRatePerTeamSeason
          : settings.defaultRatePerTeamGameday);

      let teams: Array<{ id: number; name: string }> = [];
      let participation: Array<{ gamedayId: number; teamIds: number[] }> = [];

      if (config.costModel === 'SEASON') {
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT t.id, t.name FROM gamedays_team t
           JOIN gamedays_seasonleagueteam_teams st ON st.team_id = t.id
           JOIN gamedays_seasonleagueteam slt ON slt.id = st.seasonleagueteam_id
           WHERE slt.league_id = ? AND slt.season_id = ? AND t.location != 'dummy'`,
          [config.leagueId, config.seasonId]
        );
        teams = rows as Array<{ id: number; name: string }>;
      } else {
        const [gamedays] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM gamedays_gameday WHERE league_id = ? AND season_id = ?',
          [config.leagueId, config.seasonId]
        );
        for (const gd of gamedays) {
          const [playing] = await pool.query<RowDataPacket[]>(
            `SELECT DISTINCT gr.team_id as id FROM gamedays_gameresult gr
             JOIN gamedays_gameinfo gi ON gi.id = gr.gameinfo_id
             JOIN gamedays_team t ON t.id = gr.team_id
             WHERE gi.gameday_id = ? AND t.location != 'dummy'`,
            [gd.id]
          );
          const [officiating] = await pool.query<RowDataPacket[]>(
            `SELECT DISTINCT gi.officials_id as id FROM gamedays_gameinfo gi
             JOIN gamedays_team t ON t.id = gi.officials_id
             WHERE gi.gameday_id = ? AND t.location != 'dummy' AND gi.officials_id IS NOT NULL`,
            [gd.id]
          );
          const teamIds = [
            ...new Set([
              ...playing.map((r) => r.id as number),
              ...officiating.map((r) => r.id as number),
            ]),
          ].filter(Boolean);
          participation.push({ gamedayId: gd.id as number, teamIds });
        }
      }

      return calculateCosts({
        costModel: config.costModel,
        baseRate,
        teams,
        participation,
        discounts: discountInputs,
        expectedTeamsCount: config.expectedTeamsCount,
        expectedGamedaysCount: config.expectedGamedaysCount,
        expectedTeamsPerGameday: config.expectedTeamsPerGameday,
      });
    }),
});
