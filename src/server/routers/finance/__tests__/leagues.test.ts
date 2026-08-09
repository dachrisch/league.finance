import { describe, it, expect, vi, beforeEach } from 'vitest';
import { leaguesRouter } from '../leagues';
import { getMysqlPool } from '../../../db/mysql';

vi.mock('../../../db/mysql');

describe('leaguesRouter.listBySeason', () => {
  const caller = leaguesRouter.createCaller({ user: { userId: '1', email: 'test@test.com', role: 'admin' } });

  it('queries only by season when no associationId is given', async () => {
    const query = vi.fn().mockResolvedValue([[{ _id: 1, name: 'RL Bayern', slug: 'rl-bayern', type: 'Regional' }]]);
    vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

    const result = await caller.listBySeason({ seasonId: 6 });

    expect(result).toEqual([{ _id: 1, name: 'RL Bayern', slug: 'rl-bayern', type: 'Regional' }]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).not.toContain('association_id');
    expect(params).toEqual([6]);
  });

  it('joins through team association when associationId is given', async () => {
    const query = vi.fn().mockResolvedValue([[{ _id: 1, name: 'RL Bayern', slug: 'rl-bayern', type: 'Regional' }]]);
    vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

    const result = await caller.listBySeason({ seasonId: 6, associationId: 3 });

    expect(result).toEqual([{ _id: 1, name: 'RL Bayern', slug: 'rl-bayern', type: 'Regional' }]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('gamedays_team');
    expect(sql).toContain('t.association_id = ?');
    expect(params).toEqual([6, 3]);
  });

  it('returns an empty array when the associationId matches no teams', async () => {
    const query = vi.fn().mockResolvedValue([[]]);
    vi.mocked(getMysqlPool).mockReturnValue({ query } as any);

    const result = await caller.listBySeason({ seasonId: 6, associationId: 999 });

    expect(result).toEqual([]);
  });
});
