import { describe, it, expect } from 'vitest';
import { buildStandardInvoiceAddress } from '../invoiceAddress';

describe('buildStandardInvoiceAddress', () => {
  it('includes a "z.H." line when a contact name is given', () => {
    const result = buildStandardInvoiceAddress(
      'American Football und Cheerleading Verband Nordrhein-Westfalen e.V.',
      { street: 'Halterner Straße 193', postalCode: '45770', city: 'Marl' },
      'Fabian Pawlowski'
    );
    expect(result).toBe(
      'American Football und Cheerleading Verband Nordrhein-Westfalen e.V.\n' +
      'z.H. Fabian Pawlowski\n' +
      'Halterner Straße 193\n' +
      '45770 Marl'
    );
  });

  it('omits the "z.H." line when there is no contact', () => {
    const result = buildStandardInvoiceAddress(
      'AFCV MV', { street: 'Fritz-Reuter-Straße 38', postalCode: '18057', city: 'Rostock' }, null
    );
    expect(result).toBe('AFCV MV\nFritz-Reuter-Straße 38\n18057 Rostock');
  });
});
