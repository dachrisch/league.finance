import { describe, it, expect } from 'vitest';
import { CreateInvoiceSchema, InvoiceLineInputSchema, InvoiceDiscountSchema } from '../invoice';

describe('InvoiceLineInputSchema', () => {
  it('accepts a valid offer-sourced line', () => {
    const result = InvoiceLineInputSchema.safeParse({ leagueId: 16, chosenSource: 'offer' });
    expect(result.success).toBe(true);
  });

  it('accepts a custom line with customPrice', () => {
    const result = InvoiceLineInputSchema.safeParse({ leagueId: 16, chosenSource: 'custom', customPrice: 600 });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid chosenSource', () => {
    const result = InvoiceLineInputSchema.safeParse({ leagueId: 16, chosenSource: 'bogus' });
    expect(result.success).toBe(false);
  });
});

describe('InvoiceDiscountSchema', () => {
  it('accepts a PERCENT discount', () => {
    const result = InvoiceDiscountSchema.safeParse({ type: 'PERCENT', value: 10, description: 'Rabatt' });
    expect(result.success).toBe(true);
  });

  it('defaults description to empty string when omitted', () => {
    const result = InvoiceDiscountSchema.parse({ type: 'FIXED', value: 50 });
    expect(result.description).toBe('');
  });
});

describe('CreateInvoiceSchema', () => {
  it('accepts an offerId with at least one line', () => {
    const result = CreateInvoiceSchema.safeParse({
      offerId: 'o1',
      lines: [{ leagueId: 16, chosenSource: 'offer' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty lines array', () => {
    const result = CreateInvoiceSchema.safeParse({ offerId: 'o1', lines: [] });
    expect(result.success).toBe(false);
  });

  it('accepts an optional discount', () => {
    const result = CreateInvoiceSchema.safeParse({
      offerId: 'o1',
      lines: [{ leagueId: 16, chosenSource: 'live' }],
      discount: { type: 'PERCENT', value: 5, description: 'Treue-Rabatt' },
    });
    expect(result.success).toBe(true);
  });
});
