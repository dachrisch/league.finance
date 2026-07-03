import { describe, it, expect } from 'vitest';
import { computeConfigPrices, DEFAULT_BASE_RATE } from '../configPricing';

const seasonConfig = (over: Record<string, any> = {}) => ({
  leagueId: 16,
  costModel: 'SEASON',
  baseRateOverride: null,
  customPrice: null,
  expectedTeamsCount: 3,
  expectedGamedaysCount: 0,
  expectedTeamsPerGameday: 0,
  ...over,
});

describe('computeConfigPrices', () => {
  it('SEASON basePrice = baseRate * expectedTeamsCount and finalPrice follows it', () => {
    const r = computeConfigPrices(seasonConfig());
    expect(r.basePrice).toBe(DEFAULT_BASE_RATE * 3);
    expect(r.finalPrice).toBe(DEFAULT_BASE_RATE * 3);
  });

  it('baseRateOverride replaces the default base rate', () => {
    const r = computeConfigPrices(seasonConfig({ baseRateOverride: 80 }));
    expect(r.basePrice).toBe(80 * 3);
    expect(r.finalPrice).toBe(80 * 3);
  });

  it('customPrice overrides the computed basePrice for finalPrice', () => {
    const r = computeConfigPrices(seasonConfig({ customPrice: 120 }));
    expect(r.basePrice).toBe(DEFAULT_BASE_RATE * 3);
    expect(r.finalPrice).toBe(120);
  });

  it('GAMEDAY basePrice = baseRate * expectedGamedaysCount * expectedTeamsPerGameday', () => {
    const r = computeConfigPrices(
      seasonConfig({ costModel: 'GAMEDAY', expectedGamedaysCount: 4, expectedTeamsPerGameday: 2 })
    );
    expect(r.basePrice).toBe(DEFAULT_BASE_RATE * 4 * 2);
    expect(r.finalPrice).toBe(DEFAULT_BASE_RATE * 4 * 2);
  });

  it('carries the league name through when provided', () => {
    const r = computeConfigPrices(seasonConfig(), 'RL Bayern');
    expect(r.leagueName).toBe('RL Bayern');
  });
});
