import { getMysqlPool } from '../db/mysql';

/** id → name for the given leagues (all leagues when ids is omitted). Empty map on DB failure. */
export async function fetchLeaguesMap(ids?: number[]): Promise<Record<number, string>> {
  if (ids && ids.length === 0) return {};
  try {
    const pool = getMysqlPool();
    const [rows] = ids
      ? await pool.query<any[]>('SELECT id, name FROM gamedays_league WHERE id IN (?)', [ids])
      : await pool.query<any[]>('SELECT id, name FROM gamedays_league');
    return rows.reduce((acc: Record<number, string>, r: any) => ({ ...acc, [r.id]: r.name }), {});
  } catch (err) {
    console.error('Failed to fetch league names:', err);
    return {};
  }
}
