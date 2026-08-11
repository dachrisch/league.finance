import { describe, it, expect, vi } from 'vitest';
import { Types } from 'mongoose';
import { resolveLineItemPricing } from '../invoiceLinePricing';

vi.mock('../financeDataFetcher', () => ({
  resolveBaseRate: vi.fn(),
  fetchMysqlData: vi.fn(),
}));

import { resolveBaseRate, fetchMysqlData } from '../financeDataFetcher';

const settings = { defaultRatePerTeamSeason: 50, defaultRatePerTeamGameday: 10 } as any;
const pool = {} as any;

describe('resolveLineItemPricing', () => {
  it('SEASON model: offerPrice from computeConfigPrices, livePrice from actual current teams', async () => {
    const configId = new Types.ObjectId();
    const config = {
      _id: configId,
      leagueId: 16,
      costModel: 'SEASON' as const,
      baseRateOverride: null,
      customPrice: null,
      expectedTeamsCount: 3,
      expectedGamedaysCount: 0,
      expectedTeamsPerGameday: 0,
    } as any;

    vi.mocked(resolveBaseRate).mockReturnValue(50);
    vi.mocked(fetchMysqlData).mockResolvedValue({
      teams: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }, { id: 4, name: 'D' }],
      participation: [],
    });

    const result = await resolveLineItemPricing(config, 'Regionalliga', pool, settings, []);

    expect(result.leagueId).toBe(16);
    expect(result.leagueName).toBe('Regionalliga');
    expect(result.financialConfigId).toBe(configId.toString());
    expect(result.costModel).toBe('SEASON');
    expect(result.offerPrice).toBe(150); // 50 * expectedTeamsCount(3)
    expect(result.livePrice).toBe(200); // 50 * actual teams(4)
    expect(result.liveBasis).toBe(4);
  });

  it('GAMEDAY model: livePrice reflects actual played-gameday participation', async () => {
    const config = {
      _id: new Types.ObjectId(),
      leagueId: 29,
      costModel: 'GAMEDAY' as const,
      baseRateOverride: 10,
      customPrice: null,
      expectedTeamsCount: 0,
      expectedGamedaysCount: 4,
      expectedTeamsPerGameday: 2,
    } as any;

    vi.mocked(resolveBaseRate).mockReturnValue(10);
    vi.mocked(fetchMysqlData).mockResolvedValue({
      teams: [],
      participation: [{ gamedayId: 1, teamIds: [1, 2, 3] }],
    });

    const result = await resolveLineItemPricing(config, 'U16', pool, settings, []);

    expect(result.costModel).toBe('GAMEDAY');
    expect(result.offerPrice).toBe(80); // 10 * 4 * 2
    expect(result.livePrice).toBe(30); // 10 * 3 actual participants
    expect(result.liveBasis).toBe(3);
  });

  it('passes discounts through to the live calculation', async () => {
    const config = {
      _id: new Types.ObjectId(),
      leagueId: 16,
      costModel: 'SEASON' as const,
      baseRateOverride: null,
      customPrice: null,
      expectedTeamsCount: 1,
      expectedGamedaysCount: 0,
      expectedTeamsPerGameday: 0,
    } as any;

    vi.mocked(resolveBaseRate).mockReturnValue(100);
    vi.mocked(fetchMysqlData).mockResolvedValue({
      teams: [{ id: 1, name: 'A' }],
      participation: [],
    });

    const result = await resolveLineItemPricing(config, 'Oberliga', pool, settings, [
      { type: 'FIXED', value: 20 },
    ]);

    expect(result.livePrice).toBe(80); // 100 gross - 20 fixed discount
  });
});
