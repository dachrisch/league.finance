export const DEFAULT_BASE_RATE = 50;

/**
 * Derives pricing fields (`basePrice`, `finalPrice`) from a stored FinancialConfig.
 *
 * These fields are NOT persisted on the model — they are computed on read. Any
 * surface that renders prices (offer detail, list totals, the offer PDF) must run
 * configs through this function first; passing a raw config yields `finalPrice`
 * === undefined, which downstream renders as 0,00 €.
 */
export const computeConfigPrices = (config: any, leagueName: string = 'Unknown League') => {
  const baseRate = config.baseRateOverride ?? DEFAULT_BASE_RATE;
  const basePrice = config.costModel === 'SEASON'
    ? baseRate * config.expectedTeamsCount
    : baseRate * config.expectedGamedaysCount * config.expectedTeamsPerGameday;

  return {
    ...config,
    basePrice: Math.round(basePrice * 100) / 100,
    customPrice: config.customPrice ?? null,
    finalPrice: config.customPrice != null ? config.customPrice : Math.round(basePrice * 100) / 100,
    leagueName: leagueName,
  };
};
