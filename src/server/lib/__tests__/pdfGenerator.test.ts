import { describe, it, expect } from 'vitest';
import { generateOfferPDF, OfferPDFData } from '../pdfGenerator';

describe('pdfGenerator', () => {
  const createTestData = (overrides?: Partial<OfferPDFData>): OfferPDFData => ({
    associationName: 'Test Association',
    seasonName: '2024 Season',
    createdAt: new Date('2024-01-15'),
    lineItems: [
      {
        leagueId: 1,
        leagueName: 'Premier League',
        basePrice: 500,
        customPrice: null,
        finalPrice: 500,
      },
      {
        leagueId: 2,
        leagueName: 'Division One',
        basePrice: 300,
        customPrice: 250,
        finalPrice: 250,
      },
    ],
    ...overrides,
  });

  it('should generate PDF buffer', async () => {
    const data = createTestData();
    const pdfBuffer = await generateOfferPDF(data);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000); // PDFs are at least 1KB
    // Check for PDF header
    expect(pdfBuffer.toString('latin1').startsWith('%PDF')).toBe(true);
  });

  it('should generate PDF with multiple line items', async () => {
    const data = createTestData({
      lineItems: [
        {
          leagueId: 1,
          leagueName: 'League One',
          basePrice: 500,
          customPrice: null,
          finalPrice: 500,
        },
        {
          leagueId: 2,
          leagueName: 'League Two',
          basePrice: 300,
          customPrice: 250,
          finalPrice: 250,
        },
        {
          leagueId: 3,
          leagueName: 'League Three',
          basePrice: 400,
          customPrice: null,
          finalPrice: 400,
        },
      ],
    });
    const pdfBuffer = await generateOfferPDF(data);

    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.toString('latin1').startsWith('%PDF')).toBe(true);
  });

  it('should generate PDF with empty line items', async () => {
    const data = createTestData({
      lineItems: [],
    });
    const pdfBuffer = await generateOfferPDF(data);

    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.toString('latin1').startsWith('%PDF')).toBe(true);
  });

  it('should generate PDF with single line item', async () => {
    const data = createTestData({
      lineItems: [
        {
          leagueId: 1,
          leagueName: 'Only League',
          basePrice: 1000,
          customPrice: null,
          finalPrice: 1000,
        },
      ],
    });
    const pdfBuffer = await generateOfferPDF(data);

    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });

  it('should generate PDF with many line items', async () => {
    const lineItems = Array.from({ length: 20 }, (_, i) => ({
      leagueId: i + 1,
      leagueName: `League ${i + 1}`,
      basePrice: 100 * (i + 1),
      customPrice: i % 2 === 0 ? 90 * (i + 1) : null,
      finalPrice: i % 2 === 0 ? 90 * (i + 1) : 100 * (i + 1),
    }));

    const data = createTestData({
      lineItems,
    });
    const pdfBuffer = await generateOfferPDF(data);

    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.toString('latin1').startsWith('%PDF')).toBe(true);
  });

  it('should generate PDF with decimal prices', async () => {
    const data = createTestData({
      lineItems: [
        {
          leagueId: 1,
          leagueName: 'Decimal League',
          basePrice: 299.99,
          customPrice: 249.75,
          finalPrice: 249.75,
        },
      ],
    });
    const pdfBuffer = await generateOfferPDF(data);

    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });

  it('should generate PDF with custom pricing', async () => {
    const data = createTestData({
      associationName: 'Premium Association',
      seasonName: '2024-2025',
      lineItems: [
        {
          leagueId: 1,
          leagueName: 'League A',
          basePrice: 1000,
          customPrice: null,
          finalPrice: 1000,
        },
        {
          leagueId: 2,
          leagueName: 'League B',
          basePrice: 2000,
          customPrice: 1500,
          finalPrice: 1500,
        },
      ],
    });
    const pdfBuffer = await generateOfferPDF(data);

    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });

  it('should generate PDF with different dates', async () => {
    const data = createTestData({
      createdAt: new Date('2025-12-25'),
    });
    const pdfBuffer = await generateOfferPDF(data);

    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });

  it('should generate PDF with zero prices', async () => {
    const data = createTestData({
      lineItems: [
        {
          leagueId: 1,
          leagueName: 'Free League',
          basePrice: 0,
          customPrice: null,
          finalPrice: 0,
        },
      ],
    });
    const pdfBuffer = await generateOfferPDF(data);

    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });

  it('should generate PDF with negative prices', async () => {
    const data = createTestData({
      lineItems: [
        {
          leagueId: 1,
          leagueName: 'Credit League',
          basePrice: 1000,
          customPrice: -100,
          finalPrice: -100,
        },
      ],
    });
    const pdfBuffer = await generateOfferPDF(data);

    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });

  it('should generate PDF with large prices', async () => {
    const data = createTestData({
      lineItems: [
        {
          leagueId: 1,
          leagueName: 'Expensive League',
          basePrice: 999999.99,
          customPrice: 899999.99,
          finalPrice: 899999.99,
        },
      ],
    });
    const pdfBuffer = await generateOfferPDF(data);

    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });

  it('should generate different PDFs for different data', async () => {
    const data1 = createTestData({
      associationName: 'Association A',
    });
    const data2 = createTestData({
      associationName: 'Association B',
    });

    const pdf1 = await generateOfferPDF(data1);
    const pdf2 = await generateOfferPDF(data2);

    expect(pdf1.length).toBeGreaterThan(1000);
    expect(pdf2.length).toBeGreaterThan(1000);
    // PDFs should be different (different content)
    expect(pdf1.toString('latin1')).not.toBe(pdf2.toString('latin1'));
  });
});
