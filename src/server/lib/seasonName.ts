import type { Pool } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

/** Resolves a season's display name (the year string, e.g. "2026"); falls back to the id. */
export async function resolveSeasonName(pool: Pool, seasonId: number): Promise<string> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT name FROM gamedays_season WHERE id = ?',
      [seasonId]
    );
    if (rows[0]?.name != null) return `${rows[0].name}`;
  } catch (err) {
    console.warn('Failed to fetch season name:', err);
  }
  return `${seasonId}`;
}
