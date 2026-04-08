import { calculateCosts, CalculationDiscount } from './financeCalculator';

export interface LeagueConfigForOffer {
  leagueId: number;
  leagueName: string;
  costModel: 'SEASON' | 'GAMEDAY';
  baseRateOverride: number | null;
}

export interface OfferLineItemData {
  leagueId: number;
  leagueName: string;
  basePrice: number;
  customPrice: null;
}

export interface CalculationInput {
  baseRate: number;
  teams: Record<number, number>;
  participation: Record<number, number>;
  discounts: Array<{ type: 'FIXED' | 'PERCENT'; value: number }>;
  expectedTeamsCount: number;
  expectedGamedaysCount: number;
  expectedTeamsPerGameday: number;
}

export async function calculateOfferLineItems(
  leagueConfigs: LeagueConfigForOffer[],
  input: CalculationInput
): Promise<OfferLineItemData[]> {
  return leagueConfigs.map((league) => {
    const teamCount = input.teams[league.leagueId] ?? 0;
    const participationCount = input.participation[league.leagueId] ?? 0;

    // For SEASON model, treat teams as the participation count
    // For GAMEDAY model, use the actual participation count
    let teams: Array<{ id: number; name: string }> = [];
    let participation: Array<{ gamedayId: number; teamIds: number[] }> = [];

    if (league.costModel === 'SEASON') {
      // Create dummy team entries for cost calculation
      teams = Array.from({ length: teamCount }, (_, i) => ({
        id: i + 1,
        name: `Team ${i + 1}`,
      }));
    } else {
      // For GAMEDAY, we need participation entries
      if (participationCount > 0) {
        participation = [
          {
            gamedayId: 1,
            teamIds: Array.from({ length: participationCount }, (_, i) => i + 1),
          },
        ];
      }
    }

    const costs = calculateCosts({
      costModel: league.costModel,
      baseRate: league.baseRateOverride ?? input.baseRate,
      teams,
      participation,
      discounts: input.discounts,
      expectedTeamsCount: input.expectedTeamsCount,
      expectedGamedaysCount: input.expectedGamedaysCount,
      expectedTeamsPerGameday: input.expectedTeamsPerGameday,
    });

    return {
      leagueId: league.leagueId,
      leagueName: league.leagueName,
      basePrice: costs.net,
      customPrice: null,
    };
  });
}
