export type OfferLineKind = 'league' | 'fee' | 'discount' | 'optional';

export interface OfferLine {
  label: string;
  detail?: string;
  /** EUR net; negative for kind 'discount' */
  amount: number;
  kind: OfferLineKind;
  leagueId?: number;
}

export const roundCents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const euroDe = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

/** The offer total: every line except optional ones (discounts are already negative). */
export function offerLinesTotal(lines: OfferLine[]): number {
  return roundCents(lines.filter((l) => l.kind !== 'optional').reduce((sum, l) => sum + l.amount, 0));
}

/** One 'league' line per priced FinancialConfig, in config order. */
export function linesFromConfigs(
  configs: Array<{ leagueId: number; costModel: 'SEASON' | 'GAMEDAY'; expectedTeamsCount: number;
    expectedGamedaysCount: number; expectedTeamsPerGameday: number; finalPrice: number }>,
  leaguesMap: Record<number, string>
): OfferLine[] {
  return configs.map((c) => ({
    label: leaguesMap[c.leagueId] ?? `Liga ${c.leagueId}`,
    detail: c.costModel === 'SEASON'
      ? `${c.expectedTeamsCount} Teams`
      : `${c.expectedGamedaysCount} Spieltage × ${c.expectedTeamsPerGameday} Teams`,
    amount: roundCents(c.finalPrice ?? 0),
    kind: 'league' as const,
    leagueId: c.leagueId,
  }));
}

/** A discount line worth `percent` of the selected lines' sum. */
export function percentDiscountLine(lines: OfferLine[], indexes: number[], percent: number, label?: string): OfferLine {
  const base = roundCents(indexes.reduce((sum, i) => sum + (lines[i]?.amount ?? 0), 0));
  return {
    label: label ?? `${percent} % Rabatt`,
    detail: `auf ${euroDe(base)}`,
    amount: -roundCents((base * percent) / 100),
    kind: 'discount',
  };
}

/** First invalid line, or null. */
export function validateOfferLines(lines: OfferLine[]): { index: number; message: string } | null {
  for (const [index, l] of lines.entries()) {
    if (!l.label.trim()) return { index, message: 'Bezeichnung fehlt' };
    if (!Number.isFinite(l.amount)) return { index, message: 'Betrag ungültig' };
    if (l.kind === 'discount' && l.amount > 0) return { index, message: 'Rabatt muss negativ sein' };
    if (l.kind !== 'discount' && l.amount < 0) return { index, message: 'Betrag darf nicht negativ sein' };
  }
  return null;
}
