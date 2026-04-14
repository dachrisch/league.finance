import { router, protectedProcedure } from '../../trpc';
import { getMysqlPool } from '../../db/mysql';
import type { RowDataPacket } from 'mysql2';

export const seasonsRouter = router({
  list: protectedProcedure.query(async () => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id as _id, name as year, slug FROM gamedays_season ORDER BY year DESC');
    return rows;
  }),
});
