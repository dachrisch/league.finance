import { describe, it, expect, vi } from 'vitest';
import { teamsRouter } from '../teams';
import { getMysqlPool } from '../../db/mysql';

vi.mock('../../db/mysql');

describe('teamsRouter.associations', () => {
  const caller = teamsRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });

  it('returns every leaguesphere association when no seasonId is given', async () => {
    const query = vi.fn().mockResolvedValue([[{ id: 3, abbr: 'NRW', name: 'AFCV NRW' }]]);
    vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

    const result = await caller.associations({});

    expect(result).toEqual([{ id: 3, abbr: 'NRW', name: 'AFCV NRW' }]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).not.toContain('season_id');
    expect(params).toBeUndefined();
  });

  it('scopes to associations with teams playing in the given season', async () => {
    const query = vi.fn().mockResolvedValue([[{ id: 3, abbr: 'NRW', name: 'AFCV NRW' }]]);
    vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

    const result = await caller.associations({ seasonId: 6 });

    expect(result).toEqual([{ id: 3, abbr: 'NRW', name: 'AFCV NRW' }]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('slt.season_id = ?');
    expect(params).toEqual([6]);
  });
});
