import { describe, it, expect } from 'vitest';
import {
  groupDashboardData,
  selectCurrentSeason,
  computeGrossRevenue,
  buildActiveContracts,
  buildMissingContracts,
  type DashboardOffer,
} from '../dashboardUtils';

describe('groupDashboardData', () => {
  it('groups configured and pending items by season', () => {
    const configStats = [
      { config: { seasonId: 1, leagueId: 10 }, stats: { gross: 100 } },
    ];
    const pending = [
      { seasonId: 1, leagueId: 11, leagueName: 'League B', seasonName: 'Season 1', gamedayCount: 5 },
      { seasonId: 2, leagueId: 12, leagueName: 'League C', seasonName: 'Season 2', gamedayCount: 3 },
    ];
    const seasonNames = { 1: 'Season 1', 2: 'Season 2' };
    const leagueNames = { 10: 'League A', 11: 'League B', 12: 'League C' };

    const result = groupDashboardData(configStats, pending, seasonNames, leagueNames);

    expect(result).toHaveLength(2);
    expect(result[0].seasonId).toBe(2); // Season 2 first
    expect(result[1].seasonId).toBe(1);
    expect(result[1].rows).toHaveLength(2);
    expect(result[1].totalGross).toBe(100);
  });
});

// Real season shape returned by teams.seasons: { id, name, slug } — no `_id`, no `year`.
const SEASONS = [
  { id: 6, name: '2026', slug: '2026' },
  { id: 5, name: '2025', slug: '2025' },
  { id: 4, name: '2024', slug: '2024' },
];

// Real offer shape returned by finance.offers.list: carries `totalPrice` plus a
// per-league `leaguePrices` breakdown (RL Bayern 560 + Bayern U16 280 = 840).
const ACCEPTED_OFFER: DashboardOffer = {
  _id: 'offer1',
  status: 'accepted',
  seasonId: 6,
  leagueIds: [16, 29],
  associationId: 'assoc1',
  totalPrice: 840,
  leaguePrices: [
    { leagueId: 16, finalPrice: 560 },
    { leagueId: 29, finalPrice: 280 },
  ],
};

const LEAGUE_MAP = {
  16: { name: 'RL Bayern' },
  29: { name: 'Bayern U16' },
  99: { name: 'Other League' },
};
const ASSOC_MAP = { assoc1: { name: 'AFV Bayern e.V.' } };

describe('selectCurrentSeason', () => {
  it('returns null when there are no seasons', () => {
    expect(selectCurrentSeason([])).toBeNull();
  });

  it('picks the latest season by year regardless of input order', () => {
    const shuffled = [SEASONS[1], SEASONS[2], SEASONS[0]];
    expect(selectCurrentSeason(shuffled)).toEqual({ id: 6, name: '2026', slug: '2026' });
  });
});

describe('computeGrossRevenue', () => {
  it('sums totalPrice of revenue-bearing offers in the current season', () => {
    expect(computeGrossRevenue([ACCEPTED_OFFER], 6)).toBe(840);
  });

  it('ignores offers from other seasons', () => {
    expect(computeGrossRevenue([ACCEPTED_OFFER], 5)).toBe(0);
  });

  it('ignores draft offers', () => {
    const draft = { ...ACCEPTED_OFFER, status: 'draft' };
    expect(computeGrossRevenue([draft], 6)).toBe(0);
  });

  it('returns 0 when no season is selected', () => {
    expect(computeGrossRevenue([ACCEPTED_OFFER], undefined)).toBe(0);
  });
});

describe('buildActiveContracts', () => {
  it('produces one row per contracted league with that league\'s own final price', () => {
    const rows = buildActiveContracts([ACCEPTED_OFFER], 6, LEAGUE_MAP, ASSOC_MAP);
    expect(rows).toHaveLength(2);
    // Sorted by league name: Bayern U16 (280) then RL Bayern (560).
    expect(rows.map(r => [r.leagueName, r.revenue])).toEqual([
      ['Bayern U16', 280],
      ['RL Bayern', 560],
    ]);
    expect(rows[0].assocName).toBe('AFV Bayern e.V.');
  });

  it('falls back to 0 revenue when a league has no price entry', () => {
    const offer: DashboardOffer = { ...ACCEPTED_OFFER, leaguePrices: [] };
    const rows = buildActiveContracts([offer], 6, LEAGUE_MAP, ASSOC_MAP);
    expect(rows.every(r => r.revenue === 0)).toBe(true);
  });

  it('returns nothing when the season does not match', () => {
    expect(buildActiveContracts([ACCEPTED_OFFER], 5, LEAGUE_MAP, ASSOC_MAP)).toEqual([]);
  });
});

describe('buildMissingContracts', () => {
  const LEAGUES = [
    { id: 16, name: 'RL Bayern' },
    { id: 29, name: 'Bayern U16' },
    { id: 99, name: 'Other League' },
  ];

  it('excludes leagues already covered by an offer this season', () => {
    const missing = buildMissingContracts([ACCEPTED_OFFER], 6, LEAGUES);
    expect(missing.map(m => m.name)).toEqual(['Other League']);
  });

  it('treats every league as missing when no season is selected', () => {
    expect(buildMissingContracts([ACCEPTED_OFFER], undefined, LEAGUES)).toEqual([]);
  });
});
