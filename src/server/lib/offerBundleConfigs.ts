import { Types } from 'mongoose';

export interface OfferBundleLeague {
  leaguesphereLeagueId: number;
  trackedLeagueId: string;
  expectedTeamsCount?: number;
  expectedGamedaysCount?: number;
  expectedTeamsPerGameday?: number;
  customPrice?: number | null;
}

/**
 * Builds the FinancialConfig documents for a bundle of leagues going into one
 * Offer. A document-extracted price (customPrice) always wins over the
 * formula in computeConfigPrices() — see src/server/lib/configPricing.ts.
 */
export function buildFinancialConfigDocs(
  offerId: Types.ObjectId | string,
  seasonId: number,
  costModel: 'SEASON' | 'GAMEDAY',
  leagues: OfferBundleLeague[]
) {
  return leagues.map((l) => ({
    leagueId: l.leaguesphereLeagueId,
    seasonId,
    costModel,
    baseRateOverride: null,
    customPrice: l.customPrice ?? null,
    expectedTeamsCount: l.expectedTeamsCount ?? 0,
    expectedGamedaysCount: l.expectedGamedaysCount ?? 0,
    expectedTeamsPerGameday: l.expectedTeamsPerGameday ?? 0,
    offerId,
  }));
}
