import type { FinancialConfig, CalculationResult } from '../../../shared/types';

export type DashboardRow = 
  | { type: 'CONFIGURED'; config: any; stats: any }
  | { type: 'PENDING'; leagueId: number; seasonId: number; leagueName: string; seasonName: string; gamedayCount: number };

export interface SeasonGroup {
  seasonId: number;
  seasonName: string;
  rows: DashboardRow[];
  totalGross: number;
}

export function groupDashboardData(
  configStats: any[],
  pending: any[],
  seasonNames: Record<number, string>,
  leagueNames: Record<number, string>
): SeasonGroup[] {
  const groups = new Map<number, SeasonGroup>();

  for (const item of configStats) {
    const seasonId = item.config.seasonId;
    if (!groups.has(seasonId)) {
      groups.set(seasonId, {
        seasonId,
        seasonName: seasonNames[seasonId] || `Season ${seasonId}`,
        rows: [],
        totalGross: 0,
      });
    }
    const group = groups.get(seasonId)!;
    group.rows.push({ type: 'CONFIGURED', ...item });
    group.totalGross += item.stats.gross;
  }

  for (const item of pending) {
    const seasonId = item.seasonId;
    if (!groups.has(seasonId)) {
      groups.set(seasonId, {
        seasonId,
        seasonName: item.seasonName || `Season ${seasonId}`,
        rows: [],
        totalGross: 0,
      });
    }
    const group = groups.get(seasonId)!;
    group.rows.push({ type: 'PENDING', ...item });
  }

  const sortedGroups = Array.from(groups.values()).sort((a, b) => b.seasonId - a.seasonId);

  for (const group of sortedGroups) {
    group.rows.sort((a, b) => {
      const nameA = a.type === 'CONFIGURED' ? (leagueNames[a.config.leagueId] || '') : a.leagueName;
      const nameB = b.type === 'CONFIGURED' ? (leagueNames[b.config.leagueId] || '') : b.leagueName;
      return nameA.localeCompare(nameB);
    });
  }

  return sortedGroups;
}
