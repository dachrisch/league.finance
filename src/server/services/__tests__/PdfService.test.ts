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
