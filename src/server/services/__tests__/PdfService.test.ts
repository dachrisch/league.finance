import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PDFDocument from 'pdfkit';
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

/**
 * Records every pdfkit text/image call with its position, font and size so the invoice layout
 * can be asserted against the legacy Apps Script design (the reference PDFs 20260809-0x).
 * Positions are in PDF points on A4; pdfkit's text y is the top of the line box, which is the
 * same as pdftotext's yMin measured on the reference files.
 */
describe('PdfService.generateInvoicePdf — layout matches the legacy invoice design', () => {
  type TextCall = { str: string; x: number; y: number; size: number; font: string; opts: any };
  type ImageCall = { x: number; y: number; opts: any };
  let texts: TextCall[];
  let images: ImageCall[];
  let fillColors: string[];

  beforeEach(() => {
    texts = [];
    images = [];
    fillColors = [];
    const proto = PDFDocument.prototype as any;
    const origText = proto.text;
    const origImage = proto.image;
    const origFill = proto.fillColor;
    vi.spyOn(proto, 'text').mockImplementation(function (this: any, str: any, x?: any, y?: any, opts?: any) {
      const hasXY = typeof x === 'number';
      texts.push({
        str: String(str), x: hasXY ? x : this.x, y: hasXY ? y : this.y,
        size: this._fontSize, font: this._font?.name, opts: hasXY ? opts : x,
      });
      return origText.apply(this, arguments as any);
    });
    vi.spyOn(proto, 'image').mockImplementation(function (this: any, src: any, x: number, y: number, opts: any) {
      images.push({ x, y, opts });
      return origImage.apply(this, arguments as any);
    });
    vi.spyOn(proto, 'fillColor').mockImplementation(function (this: any, color: any) {
      fillColors.push(String(color));
      return origFill.apply(this, arguments as any);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const render = () => PdfService.generateInvoicePdf(baseInvoiceData as any);
  const find = (str: string) => {
    const call = texts.find((t) => t.str === str);
    if (!call) throw new Error(`text "${str}" was not drawn; drawn: ${texts.map((t) => t.str).join(' | ')}`);
    return call;
  };
  const near = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThan(1.5);

  it('places the bumbleflies logo image top right', async () => {
    await render();
    expect(images).toHaveLength(1);
    near(images[0].x, 340.2);
    near(images[0].y, 45.4);
    near(images[0].opts.width, 226.2);
  });

  it('draws the sender line in 8pt bold under the logo', async () => {
    await render();
    const sender = find('bumbleflies UG (haftungsbeschränkt) · Gleiwitzer Str. 6d · 81929 München');
    near(sender.x, 42.5);
    near(sender.y, 127.5);
    expect(sender.size).toBe(8);
    expect(sender.font).toBe('Helvetica-Bold');
  });

  it('draws the recipient block in 12pt with the z.H. contact line', async () => {
    await render();
    const name = find('American Football und Cheerleading Verband Nordrhein-Westfalen e.V.');
    near(name.x, 42.5);
    near(name.y, 170);
    expect(name.size).toBe(12);
    near(find('z.H. Fabian Pawlowski').y, 183.8);
    near(find('Halterner Straße 193').y, 197.6);
    near(find('45770 Marl').y, 211.4);
  });

  it('draws the invoice details as a right-hand label/value block in 8pt', async () => {
    await render();
    const rows: Array<[string, string, number]> = [
      ['Kundennummer', '10010', 250.5],
      ['Rechnungsnummer', '20260529-01', 265.4],
      ['Rechnungsdatum', '29.5.2026', 280.2],
      ['Leistungszeitraum', '5.2026', 295.1],
    ];
    for (const [label, value, y] of rows) {
      const l = find(label);
      near(l.x, 416.7);
      near(l.y, y);
      expect(l.size).toBe(8);
      const v = find(value);
      near(v.y, y);
      expect(v.opts.align).toBe('right');
      near(v.x + v.opts.width, 553);
    }
  });

  it('titles the document "Rechnung" in 12pt bold', async () => {
    await render();
    const title = find('Rechnung');
    near(title.x, 42.5);
    near(title.y, 340);
    expect(title.size).toBe(12);
    expect(title.font).toBe('Helvetica-Bold');
  });

  it('draws the table header in 10pt bold at the reference columns', async () => {
    await render();
    const headers: Array<[string, number]> = [
      ['Pos', 42.8], ['Beschreibung', 72.2], ['Anzahl', 309.7], ['Preis', 353.2],
      ['Netto', 410.9], ['MwSt.', 468.6], ['Brutto', 506.4],
    ];
    for (const [str, x] of headers) {
      const h = find(str);
      near(h.x, x);
      near(h.y, 367);
      expect(h.size).toBe(10);
      expect(h.font).toBe('Helvetica-Bold');
    }
  });

  it('starts the first position row 17.2pt below the header with right-aligned gross amounts', async () => {
    await render();
    const desc = find('LeagueSphere App Saison 2026 - Regionalliga');
    near(desc.x, 72.2);
    near(desc.y, 384.2);
    // Intl renders a non-breaking space before €
    const gross = texts.find((t) => t.str.replace(/\s/g, ' ') === '771,12 €')!;
    expect(gross.opts.align).toBe('right');
    near(gross.x + gross.opts.width, 559);
  });

  it('pins the payment note and the three-column footer to the page bottom', async () => {
    await render();
    near(find('Bitte bezahlen Sie die Rechnung innerhalb von 30 Tagen nach Erhalt auf unten aufgeführtes Konto.').y, 659);
    const purpose = find('Verwendungszweck: 10010-20260529-01');
    near(purpose.y, 673.1);
    expect(purpose.font).toBe('Helvetica-Bold');
    near(find('Bei Fragen wenden Sie sich bitte an info@bumbleflies.de').y, 687.3);

    const footerColumns: Array<[string, number]> = [
      ['bumbleflies UG (haftungsbeschränkt)', 45], ['Bankverbindung', 225.4], ['Geschäftsführer:', 407.6],
    ];
    for (const [str, x] of footerColumns) {
      const f = find(str);
      near(f.x, x);
      near(f.y, 729.1);
      expect(f.size).toBe(10);
    }
  });

  it('continues long position lists on a new page instead of overlapping the payment note', async () => {
    const addPage = vi.spyOn(PDFDocument.prototype as any, 'addPage');
    const lineItems = Array.from({ length: 25 }, (_, i) => ({ leagueName: `Liga ${i + 1}`, amount: 10 }));
    await PdfService.generateInvoicePdf({ ...baseInvoiceData, lineItems } as any);

    expect(addPage).toHaveBeenCalled();
    const note = find('Bitte bezahlen Sie die Rechnung innerhalb von 30 Tagen nach Erhalt auf unten aufgeführtes Konto.');
    const rowsBeforeBreak = texts.filter((t) => /Liga \d+$/.test(t.str));
    // every row drawn on the first page ends above the pinned payment note
    const firstPageRows = rowsBeforeBreak.slice(0, rowsBeforeBreak.findIndex((t, i, all) => i > 0 && t.y < all[i - 1].y));
    expect(firstPageRows.length).toBeGreaterThan(0);
    expect(Math.max(...firstPageRows.map((t) => t.y))).toBeLessThan(note.y - 17);
  });

  it('uses black text only (no blue brand accents)', async () => {
    await render();
    expect(fillColors.every((c) => ['black', '#000000', '#000'].includes(c))).toBe(true);
  });
});
