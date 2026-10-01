import { describe, it, expect } from 'vitest';
import { offerLinesTotal, linesFromConfigs, percentDiscountLine, validateOfferLines, type OfferLine } from '../offerLines';

const ost: OfferLine[] = [
  { label: 'Oberliga Ost', detail: 'bis zu 20 Spieltage mit jeweils 6 Teams', amount: 900, kind: 'fee' },
  { label: 'U16 Sachsen', amount: 144, kind: 'league' },
  { label: 'U16 Thüringen', amount: 216, kind: 'league' },
  { label: 'U16 Sachsen-Anhalt', amount: 180, kind: 'league' },
  { label: 'U13 Mitteldeutschland', amount: 122, kind: 'league' },
  { label: 'U13 Mitteldeutschland', amount: 72, kind: 'league' },
];

describe('offerLinesTotal', () => {
  it('sums all lines except optional ones', () => {
    expect(offerLinesTotal([
      { label: 'DFFL', amount: 864, kind: 'league' },
      { label: 'DFFL2', amount: 1080, kind: 'league' },
      { label: 'DFFLF', amount: 540, kind: 'league' },
      { label: 'DFFLF2', amount: 486, kind: 'optional' },
    ])).toBe(2484);
  });

  it('subtracts discount lines', () => {
    expect(offerLinesTotal([{ label: 'A', amount: 100, kind: 'fee' }, { label: 'R', amount: -10, kind: 'discount' }])).toBe(90);
  });

  it('returns 0 for no lines', () => {
    expect(offerLinesTotal([])).toBe(0);
  });
});

describe('percentDiscountLine', () => {
  it('RF3: 15 % on the five youth leagues of Ost is exactly -110.10 and total 1523.90', () => {
    const discount = percentDiscountLine(ost, [1, 2, 3, 4, 5], 15, '15 % Rabatt auf die Jugendligen');
    expect(discount).toEqual({ label: '15 % Rabatt auf die Jugendligen', detail: `auf ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(734)}`, amount: -110.1, kind: 'discount' });
    expect(offerLinesTotal([...ost, discount])).toBe(1523.9);
  });

  it('defaults the label to "{p} % Rabatt"', () => {
    expect(percentDiscountLine(ost, [0], 10).label).toBe('10 % Rabatt');
  });

  it('ignores out-of-range indexes', () => {
    expect(percentDiscountLine(ost, [0, 99], 10).amount).toBe(-90);
  });
});

describe('linesFromConfigs', () => {
  it('builds one league line per config with team detail (SEASON) and gameday detail (GAMEDAY)', () => {
    const lines = linesFromConfigs([
      { leagueId: 1, costModel: 'SEASON', expectedTeamsCount: 12, expectedGamedaysCount: 0, expectedTeamsPerGameday: 0, finalPrice: 648 },
      { leagueId: 2, costModel: 'GAMEDAY', expectedTeamsCount: 0, expectedGamedaysCount: 20, expectedTeamsPerGameday: 6, finalPrice: 900 },
    ], { 1: 'Regionalliga NRW' });
    expect(lines).toEqual([
      { label: 'Regionalliga NRW', detail: '12 Teams', amount: 648, kind: 'league', leagueId: 1 },
      { label: 'Liga 2', detail: '20 Spieltage × 6 Teams', amount: 900, kind: 'league', leagueId: 2 },
    ]);
  });
});

describe('validateOfferLines', () => {
  it('accepts valid lines', () => {
    expect(validateOfferLines(ost)).toBeNull();
  });
  it('rejects an empty label', () => {
    expect(validateOfferLines([{ label: ' ', amount: 1, kind: 'fee' }])).toEqual({ index: 0, message: 'Bezeichnung fehlt' });
  });
  it('rejects a positive discount', () => {
    expect(validateOfferLines([{ label: 'R', amount: 5, kind: 'discount' }])).toEqual({ index: 0, message: 'Rabatt muss negativ sein' });
  });
  it('rejects a negative non-discount amount', () => {
    expect(validateOfferLines([{ label: 'X', amount: -5, kind: 'fee' }])).toEqual({ index: 0, message: 'Betrag darf nicht negativ sein' });
  });
  it('rejects non-finite amounts', () => {
    expect(validateOfferLines([{ label: 'X', amount: Number.NaN, kind: 'fee' }])).toEqual({ index: 0, message: 'Betrag ungültig' });
  });
});
