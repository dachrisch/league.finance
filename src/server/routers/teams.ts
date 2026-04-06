import { z } from 'zod';
import type { RowDataPacket } from 'mysql2';
import { router, protectedProcedure } from '../trpc';
import { getMysqlPool } from '../db/mysql';

export const teamsRouter = router({
  leagues: protectedProcedure.query(async () => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, name, slug FROM gamedays_league ORDER BY name');
    return rows;
  }),

  seasons: protectedProcedure.query(async () => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, name, slug FROM gamedays_season ORDER BY name DESC');
    return rows;
  }),

  byLeagueSeason: protectedProcedure
    .input(z.object({ leagueId: z.number(), seasonId: z.number() }))
    .query(async ({ input }) => {
      const pool = getMysqlPool();
      // SeasonLeagueTeam is a many-to-many through table
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT t.id, t.name, t.description, t.location
         FROM gamedays_team t
         JOIN gamedays_seasonleagueteam_teams st ON st.team_id = t.id
         JOIN gamedays_seasonleagueteam slt ON slt.id = st.seasonleagueteam_id
         WHERE slt.league_id = ? AND slt.season_id = ?
           AND t.location != 'dummy'
         ORDER BY t.name`,
        [input.leagueId, input.seasonId]
      );
      return rows;
    }),
});
