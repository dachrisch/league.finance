import { z } from 'zod';
import type { RowDataPacket } from 'mysql2';
import { router, protectedProcedure } from '../../trpc';
import { getMysqlPool } from '../../db/mysql';

export const leaguesRouter = router({
  listBySeason: protectedProcedure
    .input(z.object({
      seasonId: z.union([z.number(), z.string()]),
      associationId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const pool = getMysqlPool();
      const seasonId = typeof input.seasonId === 'string' ? parseInt(input.seasonId) : input.seasonId;

      if (isNaN(seasonId)) return [];

      const params: number[] = [seasonId];
      let joinClause = '';
      let whereClause = 'WHERE slt.season_id = ?';

      if (input.associationId != null) {
        joinClause = `
         JOIN gamedays_seasonleagueteam_teams st ON st.seasonleagueteam_id = slt.id
         JOIN gamedays_team t ON t.id = st.team_id`;
        whereClause += ' AND t.association_id = ? AND t.location != \'dummy\'';
        params.push(input.associationId);
      }

      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT l.id as _id, l.name, l.slug, 'Regional' as type
         FROM gamedays_league l
         JOIN gamedays_seasonleagueteam slt ON slt.league_id = l.id
         ${joinClause}
         ${whereClause}
         ORDER BY l.name`,
        params
      );

      return rows;
    }),
});
