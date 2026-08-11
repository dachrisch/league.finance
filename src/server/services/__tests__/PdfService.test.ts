import { describe, it, expect } from 'vitest';
import { PdfService } from '../PdfService';

const baseData = {
  offer: { _id: '507f1f77bcf86cd799439011' },
  contact: {
    name: 'Lynn Hoffer',
    address: { street: 'Georg Brauchle Ring 93', city: 'München', postalCode: '80992', country: 'Germany' },
    email: 'lynn@example.com',
  },
  configs: [{ leagueId: 16, finalPrice: 560, expectedTeamsCount: 1 }],
  leaguesMap: { 16: 'RL Bayern' },
  associationName: 'American Football Verband Bayern e.V.',
  seasonName: '2026',
};

const isPdf = (buf: Buffer) => Buffer.isBuffer(buf) && buf.toString('ascii', 0, 5) === '%PDF-';

describe('PdfService.generateFilename', () => {
  it('generates filename correctly', () => {
    const filename = PdfService.generateFilename('507f1f77bcf86cd799439011', 'Test Association');
    expect(filename).toMatch(/^Angebot_\d{8}-507f1f77_Test-Association\.pdf$/);
  });

  it('sanitizes special characters', () => {
    const filename = PdfService.generateFilename('507f1f77bcf86cd799439011', 'Test & Association @ 2026');
    expect(filename).not.toContain('&');
    expect(filename).not.toContain('@');
    expect(filename).toContain('Test-Association-2026');
  });
});

describe('PdfService.generateOfferPdf', () => {
  it('returns a valid PDF buffer (single config)', async () => {
    const pdf = await PdfService.generateOfferPdf(baseData as any);
    expect(isPdf(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('returns a valid PDF buffer (multiple configs)', async () => {
    const data = { ...baseData, configs: [
      { leagueId: 16, finalPrice: 560, expectedTeamsCount: 1 },
      { leagueId: 29, finalPrice: 280, expectedTeamsCount: 1 },
    ], leaguesMap: { 16: 'RL Bayern', 29: 'Bayern U16' } };
    const pdf = await PdfService.generateOfferPdf(data as any);
    expect(isPdf(pdf)).toBe(true);
  });

  it('does not throw on umlaut / euro content', async () => {
    const data = { ...baseData,
      contact: { ...baseData.contact, name: 'Christian Dähn' },
      configs: [{ leagueId: 29, finalPrice: 1440, expectedTeamsCount: 3 }],
      leaguesMap: { 29: 'Bayern U16 Süd' } };
    const pdf = await PdfService.generateOfferPdf(data as any);
    expect(isPdf(pdf)).toBe(true);
  });
});

const baseInvoiceData = {
  invoice: {
    _id: '507f1f77bcf86cd799439011',
    invoiceNumber: '20260529-01',
    invoiceDate: new Date('2026-05-29'),
    servicePeriod: '5.2026',
    customerNumber: 10010,
    discount: null,
  },
  associationName: 'American Football und Cheerleading Verband Nordrhein-Westfalen e.V.',
  contact: {
    name: 'Fabian Pawlowski',
    address: { street: 'Halterner Straße 193', postalCode: '45770', city: 'Marl' },
  },
  lineItems: [
    { leagueName: 'Regionalliga', amount: 648 },
    { leagueName: 'Oberliga', amount: 918 },
    { leagueName: 'U10', amount: 78 },
    { leagueName: 'U13', amount: 143 },
    { leagueName: 'U16', amount: 117 },
  ],
  seasonName: '2026',
};

describe('PdfService.generateInvoiceFilename', () => {
  it('matches the "<YYYY-MM>.<invoiceNumber> - <first word> <customerNumber> - Nutzung..." pattern', () => {
    const filename = PdfService.generateInvoiceFilename(
      '20260529-01', 'American Football und Cheerleading Verband Nordrhein-Westfalen e.V.',
      10010, '2026', new Date('2026-05-29')
    );
    expect(filename).toBe(
      '2026-05.20260529-01 - American 10010 - Nutzung der LeagueSphere App für die Saison 2026.pdf'
    );
  });
});

describe('PdfService.generateInvoicePdf', () => {
  it('returns a valid PDF buffer matching the sample invoice (5 leagues, no discount)', async () => {
    const pdf = await PdfService.generateInvoicePdf(baseInvoiceData as any);
    expect(isPdf(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('does not throw with a discount applied', async () => {
    const data = { ...baseInvoiceData, invoice: { ...baseInvoiceData.invoice, discount: { type: 'FIXED', value: 50, description: 'Rabatt' } } };
    const pdf = await PdfService.generateInvoicePdf(data as any);
    expect(isPdf(pdf)).toBe(true);
  });

  it('does not throw on a single line item', async () => {
    const data = { ...baseInvoiceData, lineItems: [{ leagueName: 'Regionalliga', amount: 900 }] };
    const pdf = await PdfService.generateInvoicePdf(data as any);
    expect(isPdf(pdf)).toBe(true);
  });

  it('does not throw on umlaut content in the recipient block', async () => {
    const data = {
      ...baseInvoiceData,
      contact: { name: 'Christian Dähn', address: { street: 'Gleiwitzer Str. 6d', postalCode: '81929', city: 'München' } },
    };
    const pdf = await PdfService.generateInvoicePdf(data as any);
    expect(isPdf(pdf)).toBe(true);
  });
});
