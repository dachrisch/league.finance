import { router, protectedProcedure } from '../../trpc';
import { FinancialConfig } from '../../models/FinancialConfig';
import { Discount } from '../../models/Discount';
import { getOrCreateSettings } from '../../models/FinancialSettings';
import { getMysqlPool } from '../../db/mysql';
import { calculateCosts } from '../../lib/financeCalculator';
import type { RowDataPacket } from 'mysql2';

export const dashboardRouter = router({
  summary: protectedProcedure.query(async () => {
    const pool = getMysqlPool();
    const settings = await getOrCreateSettings();
    const configs = await FinancialConfig.find().lean();

    let totalGross = 0;
    let totalDiscount = 0;
    const configStats = [];

    for (const config of configs) {
      const discounts = await Discount.find({ configId: config._id }).lean();
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

      const stats = calculateCosts({
        costModel: config.costModel,
        baseRate,
        teams,
        participation,
        discounts: discountInputs,
        expectedTeamsCount: config.expectedTeamsCount,
        expectedGamedaysCount: config.expectedGamedaysCount,
        expectedTeamsPerGameday: config.expectedTeamsPerGameday,
      });

      totalGross += stats.gross;
      totalDiscount += stats.discount;
      configStats.push({ config, stats });
    }

    // Pending: league/season combos with gamedays but no config
    const configuredPairs = new Set(
      configs.map((c) => `${c.leagueId}:${c.seasonId}`)
    );
    const [gamedayRows] = await pool.query<RowDataPacket[]>(
      `SELECT gd.league_id, gd.season_id, l.name as league_name, s.name as season_name,
              COUNT(gd.id) as gameday_count
       FROM gamedays_gameday gd
       JOIN gamedays_league l ON l.id = gd.league_id
       JOIN gamedays_season s ON s.id = gd.season_id
       GROUP BY gd.league_id, gd.season_id, l.name, s.name`
    );

    const pending = gamedayRows
      .filter((r) => !configuredPairs.has(`${r.league_id}:${r.season_id}`))
      .map((r) => ({
        leagueId: r.league_id as number,
        seasonId: r.season_id as number,
        leagueName: r.league_name as string,
        seasonName: r.season_name as string,
        gamedayCount: Number(r.gameday_count),
      }));

    return {
      totalGross,
      totalDiscount,
      totalNet: totalGross - totalDiscount,
      configStats,
      pending,
    };
  }),
});
