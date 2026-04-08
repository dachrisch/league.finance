import { describe, it, expect } from 'vitest';
import { calculateOfferLineItems } from '../offerCalculator';

describe('offerCalculator', () => {
  it('should calculate line items for multiple leagues with SEASON model', async () => {
    const leagueConfigs = [
      {
        leagueId: 1,
        leagueName: 'Premier League',
        costModel: 'SEASON' as const,
        baseRateOverride: null,
      },
      {
        leagueId: 2,
        leagueName: 'Division One',
        costModel: 'SEASON' as const,
        baseRateOverride: null,
      },
    ];

    const input = {
      baseRate: 100,
      teams: { 1: 5, 2: 3 },
      participation: {},
      discounts: [],
      expectedTeamsCount: 10,
      expectedGamedaysCount: 20,
      expectedTeamsPerGameday: 10,
    };

    const result = await calculateOfferLineItems(leagueConfigs, input);

    expect(result).toHaveLength(2);
    expect(result[0].leagueId).toBe(1);
    expect(result[0].leagueName).toBe('Premier League');
    expect(result[0].basePrice).toBe(500); // 5 teams * 100
    expect(result[0].customPrice).toBeNull();

    expect(result[1].leagueId).toBe(2);
    expect(result[1].leagueName).toBe('Division One');
    expect(result[1].basePrice).toBe(300); // 3 teams * 100
    expect(result[1].customPrice).toBeNull();
  });

  it('should calculate line items for multiple leagues with GAMEDAY model', async () => {
    const leagueConfigs = [
      {
        leagueId: 3,
        leagueName: 'Gameday League',
        costModel: 'GAMEDAY' as const,
        baseRateOverride: null,
      },
    ];

    const input = {
      baseRate: 50,
      teams: {},
      participation: { 3: 20 }, // 20 team participations
      discounts: [],
      expectedTeamsCount: 10,
      expectedGamedaysCount: 10,
      expectedTeamsPerGameday: 10,
    };

    const result = await calculateOfferLineItems(leagueConfigs, input);

    expect(result).toHaveLength(1);
    expect(result[0].leagueId).toBe(3);
    expect(result[0].basePrice).toBe(1000); // 20 * 50
  });

  it('should apply discounts to calculations', async () => {
    const leagueConfigs = [
      {
        leagueId: 1,
        leagueName: 'Premier League',
        costModel: 'SEASON' as const,
        baseRateOverride: null,
      },
    ];

    const input = {
      baseRate: 1000,
      teams: { 1: 2 },
      participation: {},
      discounts: [{ type: 'FIXED' as const, value: 100 }], // 100 fixed discount
      expectedTeamsCount: 10,
      expectedGamedaysCount: 20,
      expectedTeamsPerGameday: 10,
    };

    const result = await calculateOfferLineItems(leagueConfigs, input);

    // 2 teams * 1000 = 2000, minus 100 discount = 1900
    expect(result[0].basePrice).toBe(1900);
  });

  it('should apply percentage discounts', async () => {
    const leagueConfigs = [
      {
        leagueId: 1,
        leagueName: 'Premier League',
        costModel: 'SEASON' as const,
        baseRateOverride: null,
      },
    ];

    const input = {
      baseRate: 1000,
      teams: { 1: 2 },
      participation: {},
      discounts: [{ type: 'PERCENT' as const, value: 10 }], // 10% discount
      expectedTeamsCount: 10,
      expectedGamedaysCount: 20,
      expectedTeamsPerGameday: 10,
    };

    const result = await calculateOfferLineItems(leagueConfigs, input);

    // 2 teams * 1000 = 2000, minus 10% (200) = 1800
    expect(result[0].basePrice).toBe(1800);
  });

  it('should handle base rate override per league', async () => {
    const leagueConfigs = [
      {
        leagueId: 1,
        leagueName: 'Premium League',
        costModel: 'SEASON' as const,
        baseRateOverride: 150,
      },
      {
        leagueId: 2,
        leagueName: 'Standard League',
        costModel: 'SEASON' as const,
        baseRateOverride: null,
      },
    ];

    const input = {
      baseRate: 100,
      teams: { 1: 2, 2: 2 },
      participation: {},
      discounts: [],
      expectedTeamsCount: 10,
      expectedGamedaysCount: 20,
      expectedTeamsPerGameday: 10,
    };

    const result = await calculateOfferLineItems(leagueConfigs, input);

    expect(result[0].basePrice).toBe(300); // 2 teams * 150 (overridden rate)
    expect(result[1].basePrice).toBe(200); // 2 teams * 100 (default rate)
  });

  it('should handle empty league list', async () => {
    const result = await calculateOfferLineItems([], {
      baseRate: 100,
      teams: {},
      participation: {},
      discounts: [],
      expectedTeamsCount: 10,
      expectedGamedaysCount: 20,
      expectedTeamsPerGameday: 10,
    });

    expect(result).toHaveLength(0);
  });

  it('should handle leagues with zero teams', async () => {
    const leagueConfigs = [
      {
        leagueId: 1,
        leagueName: 'Empty League',
        costModel: 'SEASON' as const,
        baseRateOverride: null,
      },
    ];

    const input = {
      baseRate: 100,
      teams: { 1: 0 },
      participation: {},
      discounts: [],
      expectedTeamsCount: 10,
      expectedGamedaysCount: 20,
      expectedTeamsPerGameday: 10,
    };

    const result = await calculateOfferLineItems(leagueConfigs, input);

    expect(result[0].basePrice).toBe(0); // 0 teams * 100
  });

  it('should handle leagues without team data', async () => {
    const leagueConfigs = [
      {
        leagueId: 99,
        leagueName: 'Unknown League',
        costModel: 'SEASON' as const,
        baseRateOverride: null,
      },
    ];

    const input = {
      baseRate: 100,
      teams: { 1: 5 }, // Different league data
      participation: {},
      discounts: [],
      expectedTeamsCount: 10,
      expectedGamedaysCount: 20,
      expectedTeamsPerGameday: 10,
    };

    const result = await calculateOfferLineItems(leagueConfigs, input);

    expect(result[0].basePrice).toBe(0); // No data for league 99
  });

  it('should combine multiple discount types', async () => {
    const leagueConfigs = [
      {
        leagueId: 1,
        leagueName: 'Premier League',
        costModel: 'SEASON' as const,
        baseRateOverride: null,
      },
    ];

    const input = {
      baseRate: 1000,
      teams: { 1: 2 },
      participation: {},
      discounts: [
        { type: 'FIXED' as const, value: 50 },
        { type: 'PERCENT' as const, value: 10 },
      ],
      expectedTeamsCount: 10,
      expectedGamedaysCount: 20,
      expectedTeamsPerGameday: 10,
    };

    const result = await calculateOfferLineItems(leagueConfigs, input);

    // 2 teams * 1000 = 2000
    // Fixed discount: 50
    // Percent discount: 10% of 2000 = 200
    // Total discount: 250
    // Net: 2000 - 250 = 1750
    expect(result[0].basePrice).toBe(1750);
  });
});
