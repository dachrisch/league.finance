import { describe, it, expect } from 'vitest';
import {
  VAT_RATE,
  resolveLineAmount,
  computeLineVat,
  computeDiscountAmount,
  computeInvoiceTotals,
} from '../invoicePricing';

describe('VAT_RATE', () => {
  it('is 19%', () => {
    expect(VAT_RATE).toBe(0.19);
  });
});

describe('resolveLineAmount', () => {
  it('returns offerPrice when chosenSource is offer', () => {
    expect(resolveLineAmount('offer', 648, 700, null)).toBe(648);
  });

  it('returns livePrice when chosenSource is live', () => {
    expect(resolveLineAmount('live', 648, 700, null)).toBe(700);
  });

  it('returns customPrice when chosenSource is custom', () => {
    expect(resolveLineAmount('custom', 648, 700, 600)).toBe(600);
  });

  it('returns null when chosenSource is custom but customPrice is missing', () => {
    expect(resolveLineAmount('custom', 648, 700, null)).toBeNull();
  });
});

describe('computeLineVat', () => {
  it('computes 19% VAT and gross from a net amount', () => {
    const { vat, gross } = computeLineVat(648);
    expect(vat).toBe(123.12);
    expect(gross).toBe(771.12);
  });

  it('rounds to 2 decimal places', () => {
    const { vat, gross } = computeLineVat(78);
    expect(vat).toBe(14.82);
    expect(gross).toBe(92.82);
  });
});

describe('computeDiscountAmount', () => {
  it('returns 0 when no discount is given', () => {
    expect(computeDiscountAmount(1000, null)).toBe(0);
    expect(computeDiscountAmount(1000, undefined)).toBe(0);
  });

  it('applies a FIXED discount as a flat subtraction', () => {
    expect(computeDiscountAmount(1000, { type: 'FIXED', value: 50 })).toBe(50);
  });

  it('applies a PERCENT discount against the subtotal', () => {
    expect(computeDiscountAmount(1000, { type: 'PERCENT', value: 10 })).toBe(100);
  });
});

describe('computeInvoiceTotals', () => {
  it('matches the sample invoice 20260529-01 (5 leagues, no discount)', () => {
    const totals = computeInvoiceTotals([648, 918, 78, 143, 117], null);
    expect(totals.subtotal).toBe(1904);
    expect(totals.discountAmount).toBe(0);
    expect(totals.netTotal).toBe(1904);
    expect(totals.vatTotal).toBe(361.76);
    expect(totals.grossTotal).toBe(2265.76);
  });

  it('subtracts a PERCENT discount before computing VAT', () => {
    const totals = computeInvoiceTotals([1000], { type: 'PERCENT', value: 10 });
    expect(totals.subtotal).toBe(1000);
    expect(totals.discountAmount).toBe(100);
    expect(totals.netTotal).toBe(900);
    expect(totals.vatTotal).toBe(171);
    expect(totals.grossTotal).toBe(1071);
  });
});
