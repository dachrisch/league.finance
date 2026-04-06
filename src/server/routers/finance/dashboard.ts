import { router, protectedProcedure } from '../../trpc';
import { FinancialConfig, IFinancialConfig } from '../../models/FinancialConfig';
import { Discount } from '../../models/Discount';
import { getOrCreateSettings } from '../../models/FinancialSettings';
import { getMysqlPool } from '../../db/mysql';
import { calculateCosts } from '../../lib/financeCalculator';
import { resolveBaseRate, fetchMysqlData } from '../../lib/financeDataFetcher';
import type { RowDataPacket } from 'mysql2';

export const dashboardRouter = router({
  summary: protectedProcedure.query(async () => {
    const pool = getMysqlPool();
    const settings = await getOrCreateSettings();
    const configs = await FinancialConfig.find(); // removed .lean() to pass to resolveBaseRate if it expects Mongoose Document, but actually IFinancialConfig is an interface.

    let totalGross = 0;
    let totalDiscount = 0;
    const configStats = [];

    for (const config of configs) {
      const discounts = await Discount.find({ configId: config._id }).lean();
      const discountInputs = discounts.map((d) => ({ type: d.type as 'FIXED' | 'PERCENT', value: d.value }));

      const baseRate = resolveBaseRate(config, settings);
      const { teams, participation } = await fetchMysqlData(pool, config);

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
