import { describe, it, expect } from 'vitest';
import { PdfService } from '../PdfService';

describe('PdfService', () => {
  it('generates filename correctly', () => {
    const filename = PdfService.generateFilename('507f1f77bcf86cd799439011', 'Test Association');
    expect(filename).toMatch(/^Angebot_\d{8}-507f1f77_Test-Association\.pdf$/);
  });

  it('filename sanitizes special characters', () => {
    const filename = PdfService.generateFilename('507f1f77bcf86cd799439011', 'Test & Association @ 2026');
    expect(filename).not.toContain('&');
    expect(filename).not.toContain('@');
    expect(filename).toContain('Test-Association-2026');
  });

  it('returns valid PDF buffer', async () => {
    const mockData = {
      offer: { _id: '507f1f77bcf86cd799439011' },
      contact: {
        name: 'Test Contact',
        street: 'Test Street 1',
        city: 'Test City',
        postalCode: '12345',
        country: 'Germany',
        email: 'test@example.com',
      },
      configs: [
        {
          leagueId: 1,
          finalPrice: 100,
          expectedTeamsCount: 5,
        },
      ],
      leaguesMap: { 1: 'Test League' },
      associationName: 'Test Assoc',
      seasonName: '2026',
    };

    const pdf = await PdfService.generateOfferPdf(mockData);
    // Puppeteer returns Uint8Array, convert to check
    expect(pdf.length).toBeGreaterThan(1000);
    // Check for PDF header
    const header = Buffer.isBuffer(pdf) ? pdf.toString('ascii', 0, 4) : Buffer.from(pdf).toString('ascii', 0, 4);
    expect(header).toBe('%PDF');
  });
});
