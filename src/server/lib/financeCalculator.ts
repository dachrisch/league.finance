import type { CalculationDetail, CalculationResult } from '../../../shared/types';

export interface CalculationTeam {
  id: number;
  name: string;
}

export interface ParticipationEntry {
  gamedayId: number;
  teamIds: number[];
}

export interface CalculationDiscount {
  type: 'FIXED' | 'PERCENT';
  value: number;
}

export interface CalculationInput {
  costModel: 'SEASON' | 'GAMEDAY';
  baseRate: number;
  teams: CalculationTeam[];
  participation: ParticipationEntry[];
  discounts: CalculationDiscount[];
  expectedTeamsCount?: number;
  expectedGamedaysCount?: number;
  expectedTeamsPerGameday?: number;
}

function applyDiscounts(gross: number, discounts: CalculationDiscount[]): number {
  return discounts.reduce((total, d) => {
    if (d.type === 'FIXED') return total + d.value;
    return total + (gross * d.value) / 100;
  }, 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateCosts(input: CalculationInput): CalculationResult {
  const {
    costModel,
    baseRate,
    teams,
    participation,
    discounts,
    expectedTeamsCount = 0,
    expectedGamedaysCount = 0,
    expectedTeamsPerGameday = 0,
  } = input;

  if (costModel === 'SEASON') {
    const details: CalculationDetail[] = teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      gross: baseRate,
      discount: 0,
      net: baseRate,
    }));

    const gross = teams.length * baseRate;
    const discount = applyDiscounts(gross, discounts);

    return {
      gross: round2(gross),
      discount: round2(discount),
      net: round2(gross - discount),
      baseRate: round2(baseRate),
      expectedGross: round2(expectedTeamsCount * baseRate),
      expectedParticipationCount: expectedTeamsCount,
      liveParticipationCount: teams.length,
      details,
    };
  }

  // GAMEDAY model
  const liveParticipationCount = participation.reduce((sum, p) => sum + p.teamIds.length, 0);
  const gross = liveParticipationCount * baseRate;
  const discount = applyDiscounts(gross, discounts);

  return {
    gross: round2(gross),
    discount: round2(discount),
    net: round2(gross - discount),
    baseRate: round2(baseRate),
    expectedGross: round2(expectedGamedaysCount * expectedTeamsPerGameday * baseRate),
    expectedParticipationCount: expectedGamedaysCount * expectedTeamsPerGameday,
    liveParticipationCount,
    details: null,
  };
}
