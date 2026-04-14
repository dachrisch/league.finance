import { z } from 'zod';
import type { RowDataPacket } from 'mysql2';
import { router, protectedProcedure } from '../../trpc';
import { getMysqlPool } from '../../db/mysql';

export const leaguesRouter = router({
  listBySeason: protectedProcedure
    .input(z.object({ seasonId: z.union([z.number(), z.string()]) }))
    .query(async ({ input }) => {
      const pool = getMysqlPool();
      const seasonId = typeof input.seasonId === 'string' ? parseInt(input.seasonId) : input.seasonId;
      
      if (isNaN(seasonId)) return [];

      // Fetch leagues that are associated with this season
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT l.id as _id, l.name, l.slug, 'Regional' as type
         FROM gamedays_league l
         JOIN gamedays_seasonleagueteam slt ON slt.league_id = l.id
         WHERE slt.season_id = ?
         ORDER BY l.name`,
        [seasonId]
      );
      
      return rows;
    }),
});
