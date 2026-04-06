import { describe, it, expect } from 'vitest';
import { calculateCosts } from '../financeCalculator';

const base = {
  expectedTeamsCount: 0,
  expectedGamedaysCount: 0,
  expectedTeamsPerGameday: 0,
  discounts: [] as Array<{ type: 'FIXED' | 'PERCENT'; value: number }>,
};

describe('calculateCosts — SEASON model', () => {
  it('computes gross as teamCount × baseRate', () => {
    const result = calculateCosts({
      ...base,
      costModel: 'SEASON',
      baseRate: 50,
      teams: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
      participation: [],
      expectedTeamsCount: 3,
    });
    expect(result.gross).toBe(100);
    expect(result.net).toBe(100);
    expect(result.discount).toBe(0);
    expect(result.liveParticipationCount).toBe(2);
    expect(result.expectedGross).toBe(150); // 3 × 50
  });

  it('applies a FIXED discount to gross', () => {
    const result = calculateCosts({
      ...base,
      costModel: 'SEASON',
      baseRate: 50,
      teams: [{ id: 1, name: 'A' }],
      participation: [],
      discounts: [{ type: 'FIXED', value: 10 }],
    });
    expect(result.gross).toBe(50);
    expect(result.discount).toBe(10);
    expect(result.net).toBe(40);
  });

  it('applies a PERCENT discount to gross', () => {
    const result = calculateCosts({
      ...base,
      costModel: 'SEASON',
      baseRate: 100,
      teams: [{ id: 1, name: 'A' }],
      participation: [],
      discounts: [{ type: 'PERCENT', value: 20 }],
    });
    expect(result.gross).toBe(100);
    expect(result.discount).toBe(20);
    expect(result.net).toBe(80);
  });

  it('stacks multiple discounts', () => {
    const result = calculateCosts({
      ...base,
      costModel: 'SEASON',
      baseRate: 100,
      teams: [{ id: 1, name: 'A' }],
      participation: [],
      discounts: [
        { type: 'FIXED', value: 10 },
        { type: 'PERCENT', value: 10 },
      ],
    });
    expect(result.discount).toBe(20); // 10 + 10% of 100
    expect(result.net).toBe(80);
  });

  it('returns per-team details', () => {
    const result = calculateCosts({
      ...base,
      costModel: 'SEASON',
      baseRate: 50,
      teams: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
      participation: [],
    });
    expect(result.details).toHaveLength(2);
    expect(result.details![0]).toMatchObject({ teamId: 1, gross: 50 });
  });
});

describe('calculateCosts — GAMEDAY model', () => {
  it('computes gross from participation data', () => {
    const result = calculateCosts({
      ...base,
      costModel: 'GAMEDAY',
      baseRate: 25,
      teams: [],
      participation: [
        { gamedayId: 1, teamIds: [1, 2, 3] },
        { gamedayId: 2, teamIds: [1, 2] },
      ],
      expectedGamedaysCount: 2,
      expectedTeamsPerGameday: 3,
    });
    expect(result.gross).toBe(125); // (3 + 2) × 25
    expect(result.liveParticipationCount).toBe(5);
    expect(result.expectedGross).toBe(150); // 2 × 3 × 25
    expect(result.details).toBeNull();
  });

  it('applies a FIXED discount to total gross', () => {
    const result = calculateCosts({
      ...base,
      costModel: 'GAMEDAY',
      baseRate: 25,
      teams: [],
      participation: [{ gamedayId: 1, teamIds: [1, 2] }],
      discounts: [{ type: 'FIXED', value: 15 }],
    });
    expect(result.gross).toBe(50);
    expect(result.discount).toBe(15);
    expect(result.net).toBe(35);
  });
});
