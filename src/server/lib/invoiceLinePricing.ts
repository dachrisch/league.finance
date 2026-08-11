import type { Pool } from 'mysql2/promise';
import type { IFinancialConfig } from '../models/FinancialConfig';
import type { IFinancialSettings } from '../models/FinancialSettings';
import { resolveBaseRate, fetchMysqlData } from './financeDataFetcher';
import { calculateCosts, CalculationDiscount } from './financeCalculator';
import { computeConfigPrices } from './configPricing';

export interface LineItemPricing {
  leagueId: number;
  leagueName: string;
  financialConfigId: string;
  costModel: 'SEASON' | 'GAMEDAY';
  offerPrice: number;
  livePrice: number;
  liveBasis: number;
}

/**
 * Resolves both pricing options for one invoice line item: the offer's locked-in
 * price (from expected numbers set at offer time) and the live price (from actual
 * current teams / played-gameday participation in LeagueSphere's prod MySQL).
 */
export async function resolveLineItemPricing(
  config: IFinancialConfig,
  leagueName: string,
  pool: Pool,
  settings: IFinancialSettings,
  discounts: CalculationDiscount[]
): Promise<LineItemPricing> {
  const offerPrice = computeConfigPrices(config).finalPrice;
  const baseRate = resolveBaseRate(config, settings);
  const { teams, participation } = await fetchMysqlData(pool, config);

  const result = calculateCosts({
    costModel: config.costModel,
    baseRate,
    teams,
    participation,
    discounts,
    expectedTeamsCount: config.expectedTeamsCount,
    expectedGamedaysCount: config.expectedGamedaysCount,
    expectedTeamsPerGameday: config.expectedTeamsPerGameday,
  });

  return {
    leagueId: config.leagueId,
    leagueName,
    financialConfigId: (config as any)._id.toString(),
    costModel: config.costModel,
    offerPrice,
    livePrice: result.net,
    liveBasis: result.liveParticipationCount,
  };
}
