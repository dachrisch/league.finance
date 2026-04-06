import { describe, it, expect } from 'vitest';
import { groupDashboardData } from '../dashboardUtils';

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
