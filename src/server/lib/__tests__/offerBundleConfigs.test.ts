import { describe, it, expect } from 'vitest';
import { buildFinancialConfigDocs } from '../offerBundleConfigs';

describe('buildFinancialConfigDocs', () => {
  it('builds one config per league carrying the offer id and season', () => {
    const docs = buildFinancialConfigDocs('offer-1', 2026, 'SEASON', [
      { leaguesphereLeagueId: 16, trackedLeagueId: 'tl-1', customPrice: 630 },
      { leaguesphereLeagueId: 17, trackedLeagueId: 'tl-2' },
    ]);

    expect(docs).toEqual([
      {
        leagueId: 16, seasonId: 2026, costModel: 'SEASON', baseRateOverride: null,
        customPrice: 630, expectedTeamsCount: 0, expectedGamedaysCount: 0,
        expectedTeamsPerGameday: 0, offerId: 'offer-1',
      },
      {
        leagueId: 17, seasonId: 2026, costModel: 'SEASON', baseRateOverride: null,
        customPrice: null, expectedTeamsCount: 0, expectedGamedaysCount: 0,
        expectedTeamsPerGameday: 0, offerId: 'offer-1',
      },
    ]);
  });

  it('carries through explicit team/gameday estimates when the document gives them', () => {
    const docs = buildFinancialConfigDocs('offer-2', 2026, 'GAMEDAY', [
      { leaguesphereLeagueId: 20, trackedLeagueId: 'tl-3', expectedGamedaysCount: 20, expectedTeamsPerGameday: 6 },
    ]);

    expect(docs[0]).toMatchObject({ expectedGamedaysCount: 20, expectedTeamsPerGameday: 6 });
  });
});
