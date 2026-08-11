import { describe, it, expect, vi } from 'vitest';
import { resolveSeasonName } from '../seasonName';

describe('resolveSeasonName', () => {
  it('returns the season name when found', async () => {
    const pool = { query: vi.fn().mockResolvedValue([[{ name: '2026' }]]) } as any;
    expect(await resolveSeasonName(pool, 6)).toBe('2026');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('gamedays_season'),
      [6]
    );
  });

  it('falls back to the seasonId when no row is found', async () => {
    const pool = { query: vi.fn().mockResolvedValue([[]]) } as any;
    expect(await resolveSeasonName(pool, 6)).toBe('6');
  });

  it('falls back to the seasonId when the query throws', async () => {
    const pool = { query: vi.fn().mockRejectedValue(new Error('connection lost')) } as any;
    expect(await resolveSeasonName(pool, 6)).toBe('6');
  });
});
