/**
 * Offer shape as returned by `finance.offers.list`. The list endpoint attaches a
 * per-offer `totalPrice` and a per-league `leaguePrices` breakdown, both derived
 * from the offer's FinancialConfig records.
 */
export interface DashboardOffer {
  _id: string;
  status: string;
  seasonId: number;
  leagueIds: number[];
  associationId: string;
  totalPrice: number;
  leaguePrices?: Array<{ leagueId: number; finalPrice: number }>;
}

export interface ActiveContractRow {
  leagueId: number;
  leagueName: string;
  assocName: string;
  status: string;
  offerId: string;
  revenue: number;
}

// Offer statuses that count toward tracked revenue.
const REVENUE_STATUSES = new Set(['sent', 'accepted', 'sending']);

/**
 * Select the current season (latest year first). Seasons come from `teams.seasons`
 * as `{ id, name, slug }` where `name` is the year string (e.g. "2026").
 */
export function selectCurrentSeason<T extends { name: string }>(seasons: T[]): T | null {
  if (!seasons.length) return null;
  return [...seasons].toSorted((a, b) => Number(b.name) - Number(a.name))[0];
}

/** Gross revenue = sum of `totalPrice` for revenue-bearing offers in the season. */
export function computeGrossRevenue(offers: DashboardOffer[], seasonId: number | undefined): number {
  if (seasonId == null) return 0;
  return offers
    .filter(o => o.seasonId === seasonId && REVENUE_STATUSES.has(o.status))
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
}

/**
 * One row per contracted league in the season, showing that league's own
 * `finalPrice` from the offer's per-league `leaguePrices` breakdown.
 */
export function buildActiveContracts(
  offers: DashboardOffer[],
  seasonId: number | undefined,
  leagueMap: Record<number, { name: string }>,
  assocMap: Record<string, { name: string }>
): ActiveContractRow[] {
  if (seasonId == null) return [];

  const rows: ActiveContractRow[] = [];
  const seen = new Set<number>();

  offers
    .filter(o => o.seasonId === seasonId)
    .forEach(offer => {
      offer.leagueIds.forEach(lId => {
        if (seen.has(lId)) return;
        seen.add(lId);
        const leaguePrice = offer.leaguePrices?.find(lp => lp.leagueId === lId);
        rows.push({
          leagueId: lId,
          leagueName: leagueMap[lId]?.name || `League ${lId}`,
          assocName: assocMap[offer.associationId]?.name || 'Unknown',
          status: offer.status,
          offerId: offer._id,
          revenue: leaguePrice?.finalPrice ?? 0,
        });
      });
    });

  return rows.toSorted((a, b) => a.leagueName.localeCompare(b.leagueName));
}

/** Leagues in the season that have no offer at all. */
export function buildMissingContracts(
  offers: DashboardOffer[],
  seasonId: number | undefined,
  leagues: Array<{ id: number; name: string }>
): Array<{ id: number; name: string }> {
  if (seasonId == null || !leagues.length) return [];

  const contracted = new Set<number>();
  offers
    .filter(o => o.seasonId === seasonId)
    .forEach(o => o.leagueIds.forEach(id => contracted.add(id)));

  return leagues
    .filter(l => !contracted.has(l.id))
    .map(l => ({ id: l.id, name: l.name }))
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

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

  const sortedGroups = Array.from(groups.values()).toSorted((a, b) => b.seasonId - a.seasonId);

  for (const group of sortedGroups) {
    group.rows.sort((a, b) => {
      const nameA = a.type === 'CONFIGURED' ? (leagueNames[a.config.leagueId] || '') : a.leagueName;
      const nameB = b.type === 'CONFIGURED' ? (leagueNames[b.config.leagueId] || '') : b.leagueName;
      return nameA.localeCompare(nameB);
    });
  }

  return sortedGroups;
}
