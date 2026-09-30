import PDFDocument from 'pdfkit';
import { buildLineDescriptions } from '../../../shared/lib/invoiceDescriptions';
import { computeLineVat, computeInvoiceTotals } from '../lib/invoicePricing';
import { buildStandardInvoiceAddress } from '../lib/invoiceAddress';
import { BUMBLEFLIES_LOGO_PNG } from '../assets/bumbleflies-logo';

export interface PdfGenerationData {
  offer: any;
  contact: any;
  configs: any[];
  leaguesMap: Record<number, string>;
  associationName: string;
  seasonName: string;
}

export interface InvoicePdfGenerationData {
  invoice: {
    _id: string;
    invoiceNumber: string;
    invoiceDate: Date;
    servicePeriod: string;
    customerNumber: number;
    discount?: { type: 'FIXED' | 'PERCENT'; value: number; description: string } | null;
  };
  associationName: string;
  contact: { name: string; address: { street: string; postalCode: string; city: string } };
  lineItems: Array<{ leagueName: string; amount: number }>;
  seasonName: string;
}

const BLUE = '#2c5aa0';
const GREY = '#666666';
const DARK = '#333333';

/**
 * Absolute positions (A4 points) of the legacy Apps Script invoice, measured from the issued
 * PDFs (e.g. 20260809-02). jsPDF drew in mm: left margin 15mm = 42.5pt, logo at 120/16mm.
 */
const INVOICE_LAYOUT = {
  left: 42.5,
  logo: { x: 340.2, y: 45.4, width: 226.2 },
  senderY: 127.5,
  recipientY: 170,
  recipientLineHeight: 13.8,
  detailsY: 250.5,
  detailsLineHeight: 14.9,
  detailsLabelX: 416.7,
  detailsValueRight: 553,
  titleY: 340,
  /** where positions continue on follow-up pages */
  continuationTopY: 42.5,
  tableHeaderY: 367,
  /** distance between table rows / total rows */
  rowGap: 17.2,
  /** 10pt text line height, also used between wrapped description lines and footer lines */
  textLineHeight: 11.5,
  wrapLineGap: 0,
  totalsOffset: 5.6 - (17.2 - 11.5),
  totalsLabelRight: 501.1,
  columns: {
    pos: 42.8, posRight: 66.6,
    description: 72.2, descriptionWidth: 225,
    quantity: 309.7, quantityRight: 347.6,
    price: 353.2, priceRight: 405.7,
    net: 410.9, netRight: 463.4,
    vat: 468.6, vatRight: 500.8,
    gross: 506.4, grossRight: 559,
  },
  paymentNoteY: 659,
  paymentNoteLineHeight: 14.15,
  footerY: 729.1,
  footerColumns: [45, 225.4, 407.6] as const,
};

/** Width of the box right-aligned text is laid into; only its right edge matters. */
const RIGHT_ALIGN_BOX = 150;

const euro = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
const deDate = (d: Date) => d.toLocaleDateString('de-DE');

export class PdfService {
  static generateOfferPdf(data: PdfGenerationData): Promise<Buffer> {
    const { offer, contact, configs, leaguesMap, associationName, seasonName } = data;
    const offerId8 = offer._id.toString().substring(0, 8);
    const totalPrice = configs.reduce((sum, c) => sum + (c.finalPrice || 0), 0);
    // Contact address may be nested (real Contact doc) or flat (legacy) — support both.
    const addr = contact.address ?? contact;

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const contentWidth = right - left;

    // Header
    doc.font('Helvetica-Bold').fontSize(24).fillColor(BLUE).text('bumbleflies', left);
    doc.font('Helvetica').fontSize(9).fillColor(GREY)
      .text('bumbleflies UG (haftungsbeschränkt) · Gleiwitzer Str. 6d · 81929 München', left);
    doc.moveDown(0.5);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor(BLUE).lineWidth(2).stroke();
    doc.moveDown(1.5);

    // Recipient
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GREY).text('ANGEBOT AN:', left);
    doc.moveDown(0.3);
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text(contact.name ?? '', left);
    doc.font('Helvetica').fontSize(10)
      .text(addr.street ?? '', left)
      .text(`${addr.postalCode ?? ''} ${addr.city ?? ''}`.trim(), left)
      .text(addr.country ?? '', left)
      .text(contact.email ?? '', left);
    doc.moveDown(1.5);

    // Title + meta
    doc.font('Helvetica-Bold').fontSize(15).fillColor(BLUE)
      .text(`Angebot: ${offerId8} – Nutzung der LeagueSphere App für die Saison ${seasonName}`,
        left, doc.y, { width: contentWidth });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(9).fillColor(GREY)
      .text(`Angebots-ID: ${offerId8}`, left)
      .text(`Datum: ${deDate(new Date())}`, left)
      .text(`Organisation: ${associationName}`, left);

    const section = (title: string) => {
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(13).fillColor(BLUE).text(title, left);
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10.5).fillColor(DARK);
    };

    // Unser Angebot
    section('Unser Angebot');
    doc.text(`Wir freuen uns, dir unser Angebot für die Nutzung der LeagueSphere App zur effizienten ` +
      `Organisation und Verwaltung der Saison ${seasonName} zu unterbreiten.`,
      left, doc.y, { width: contentWidth });

    // Leistungsumfang
    section('Leistungsumfang');
    doc.text('Die Anwendung kann unter https://leaguesphere.app von allen Spieler:innen und ' +
      'Zuschauer:innen genutzt werden, mit folgenden Funktionen:', left, doc.y, { width: contentWidth });
    doc.moveDown(0.3);
    doc.list([
      'Einfache Spielplanerstellung und Einteilung der Offiziellen',
      'Live-Ergebnisse für die Fans und Teams',
      'Liveticker für die Fans',
      'Tracking der Schiedsrichtereinsätze',
      'Digitaler Passcheck der Teams ohne Listen zu drucken',
      'Automatischer digitaler Passtransfer innerhalb der App',
    ], left, doc.y, { width: contentWidth, bulletRadius: 1.5, textIndent: 12 });

    // Preise und Konditionen (table)
    section('Preise und Konditionen');
    const colTeams = left + contentWidth * 0.55;
    const colPrice = left + contentWidth * 0.78;
    const priceW = right - colPrice;
    const teamsW = contentWidth * 0.2;
    const rowH = 18;
    let y = doc.y + 4;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK);
    doc.text('Liga/League', left, y);
    doc.text('Teams', colTeams, y, { width: teamsW, align: 'right' });
    doc.text('Preis', colPrice, y, { width: priceW, align: 'right' });
    y += rowH;
    doc.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor(BLUE).lineWidth(1).stroke();
    doc.font('Helvetica').fontSize(10).fillColor(DARK);
    for (const c of configs) {
      doc.text(leaguesMap[c.leagueId] || 'Unknown', left, y, { width: contentWidth * 0.5 });
      doc.text(String(c.expectedTeamsCount ?? 0), colTeams, y, { width: teamsW, align: 'right' });
      doc.text(euro(c.finalPrice || 0), colPrice, y, { width: priceW, align: 'right' });
      y += rowH;
    }
    doc.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor('#cccccc').lineWidth(0.5).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK);
    doc.text('Gesamt (zzgl. MwSt.)', left, y, { width: contentWidth * 0.7 });
    doc.text(euro(totalPrice), colPrice, y, { width: priceW, align: 'right' });
    doc.x = left;
    doc.y = y + rowH;

    // Note
    doc.moveDown(0.6);
    doc.font('Helvetica').fontSize(10).fillColor(DARK)
      .text('Alle oben genannten Preise verstehen sich zzgl. der gesetzlichen MwSt.', left, doc.y, { width: contentWidth });
    const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    doc.text(`Wir binden uns an dieses Angebot bis zum ${deDate(until)}.`, left, doc.y, { width: contentWidth });

    // Sign-off
    doc.moveDown(1.2);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(DARK).text('Viele Grüße', left);
    doc.font('Helvetica').text('bumbleflies (i.V. Christian Dähn)', left);

    // Footer
    doc.moveDown(2);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#dddddd').lineWidth(0.5).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(8).fillColor(GREY)
      .text('bumbleflies UG (haftungsbeschränkt) · Geschäftsführer: Christoph Kämpfe, Christian Dähn, Sebastian Keller', left, doc.y, { width: contentWidth })
      .text('Gleiwitzer Str. 6d, 81929 München · GLS Bank · IBAN: DE96430609671106170600', left, doc.y, { width: contentWidth })
      .text('info@bumbleflies.de · bumbleflies.de', left, doc.y, { width: contentWidth });

    doc.end();
    return done;
  }

  static generateFilename(offerId: string, associationName: string): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const sanitizedName = associationName
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30);
    return `Angebot_${date}-${offerId.substring(0, 8)}_${sanitizedName}.pdf`;
  }

  /**
   * Renders an invoice in the legacy Apps Script (jsPDF) design so app-issued invoices look
   * like the ones already sent. All positions are absolute A4 points measured from those PDFs
   * (see INVOICE_LAYOUT); text y is the top of the line box.
   */
  static generateInvoicePdf(data: InvoicePdfGenerationData): Promise<Buffer> {
    const { invoice, associationName, contact, lineItems, seasonName } = data;
    const L = INVOICE_LAYOUT;
    const descriptions = buildLineDescriptions(lineItems.map((li) => li.leagueName), seasonName);
    const totals = computeInvoiceTotals(lineItems.map((li) => li.amount), invoice.discount);

    // No margins: every element is placed absolutely, and pdfkit must not auto-break the page
    // when the footer is drawn close to the bottom edge.
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const text = (str: string, x: number, y: number, size: number, bold = false, opts: PDFKit.Mixins.TextOptions = {}) =>
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).text(str, x, y, { lineBreak: false, ...opts });
    const right = (str: string, rightEdge: number, y: number, size: number, bold = false) =>
      text(str, rightEdge - RIGHT_ALIGN_BOX, y, size, bold, { width: RIGHT_ALIGN_BOX, align: 'right' });

    doc.fillColor('black');

    // Logo + sender line
    doc.image(BUMBLEFLIES_LOGO_PNG, L.logo.x, L.logo.y, { width: L.logo.width });
    text('bumbleflies UG (haftungsbeschränkt) · Gleiwitzer Str. 6d · 81929 München', L.left, L.senderY, 8, true);

    // Recipient
    const recipientLines = buildStandardInvoiceAddress(associationName, contact.address, contact.name).split('\n');
    recipientLines.forEach((line, i) => text(line, L.left, L.recipientY + i * L.recipientLineHeight, 12));

    // Invoice details (right-hand label/value block)
    const details: Array<[string, string]> = [
      ['Kundennummer', String(invoice.customerNumber)],
      ['Rechnungsnummer', invoice.invoiceNumber],
      ['Rechnungsdatum', deDate(invoice.invoiceDate)],
      ['Leistungszeitraum', invoice.servicePeriod],
    ];
    details.forEach(([label, value], i) => {
      const y = L.detailsY + i * L.detailsLineHeight;
      text(label, L.detailsLabelX, y, 8);
      right(value, L.detailsValueRight, y, 8);
    });

    text('Rechnung', L.left, L.titleY, 12, true);

    // Positions table
    const c = L.columns;
    const headers: Array<[string, number]> = [
      ['Pos', c.pos], ['Beschreibung', c.description], ['Anzahl', c.quantity], ['Preis', c.price],
      ['Netto', c.net], ['MwSt.', c.vat], ['Brutto', c.gross],
    ];
    const drawHeader = (headerY: number) => headers.forEach(([label, x]) => text(label, x, headerY, 10, true));
    drawHeader(L.tableHeaderY);

    let y = L.tableHeaderY + L.rowGap;
    // Content must end above the payment note pinned to the bottom of the last page;
    // anything that would cross it continues on a new page.
    const contentBottom = L.paymentNoteY - L.rowGap;
    const newPage = () => {
      doc.addPage({ size: 'A4', margin: 0 });
      y = L.continuationTopY;
    };
    const drawRow = (pos: number, description: string, amount: number) => {
      if (y + L.rowGap > contentBottom) {
        newPage();
        drawHeader(y);
        y += L.rowGap;
      }
      const { gross } = computeLineVat(amount);
      right(String(pos), c.posRight, y, 10);
      doc.font('Helvetica').fontSize(10)
        .text(description, c.description, y, { width: c.descriptionWidth, lineGap: L.wrapLineGap });
      const rowBottom = doc.y;
      right('1', c.quantityRight, y, 10);
      right(euro(amount), c.priceRight, y, 10);
      right(euro(amount), c.netRight, y, 10);
      right('19 %', c.vatRight, y, 10);
      right(euro(gross), c.grossRight, y, 10);
      y = Math.max(rowBottom, y + L.textLineHeight) + (L.rowGap - L.textLineHeight);
    };
    lineItems.forEach((li, i) => drawRow(i + 1, descriptions[i], li.amount));
    if (invoice.discount) {
      drawRow(lineItems.length + 1, invoice.discount.description || 'Rabatt', -totals.discountAmount);
    }

    // Totals
    y += L.totalsOffset;
    if (y + 3 * L.rowGap > contentBottom) newPage();
    const totalRows: Array<[string, number, boolean]> = [
      ['Nettobetrag', totals.netTotal, false],
      ['MwSt.19 %', totals.vatTotal, false],
      ['Gesamtbetrag', totals.grossTotal, true],
    ];
    for (const [label, amount, bold] of totalRows) {
      right(label, L.totalsLabelRight, y, 10, bold);
      right(euro(amount), c.grossRight, y, 10, bold);
      y += L.rowGap;
    }

    // Payment note + footer are pinned to the bottom of the last page.
    text('Bitte bezahlen Sie die Rechnung innerhalb von 30 Tagen nach Erhalt auf unten aufgeführtes Konto.',
      L.left, L.paymentNoteY, 10);
    text(`Verwendungszweck: ${invoice.customerNumber}-${invoice.invoiceNumber}`,
      L.left, L.paymentNoteY + L.paymentNoteLineHeight, 10, true);
    text('Bei Fragen wenden Sie sich bitte an info@bumbleflies.de',
      L.left, L.paymentNoteY + 2 * L.paymentNoteLineHeight, 10);

    const footer: Array<[number, string[]]> = [
      [L.footerColumns[0], [
        'bumbleflies UG (haftungsbeschränkt)', 'Gleiwitzer Str. 6d', '81929 München',
        'info@bumbleflies.de', '+49 176 66635265', 'https://bumbleflies.de',
      ]],
      [L.footerColumns[1], [
        'Bankverbindung', 'GLS Gemeinschaftsbank eG Bochum', 'IBAN: DE96430609671106170600',
        'Kontonummer: 1106170600', 'BIC: GENODEM1GLS',
      ]],
      [L.footerColumns[2], [
        'Geschäftsführer:', 'Christoph Kämpfe', 'Christian Dähn', 'Sebastian Keller',
        'HRB: 260473 München', 'Steuernummer: 143/122/61929',
      ]],
    ];
    for (const [x, lines] of footer) {
      lines.forEach((line, i) => text(line, x, L.footerY + i * L.textLineHeight, 10));
    }

    doc.end();
    return done;
  }

  static generateInvoiceFilename(
    invoiceNumber: string,
    associationName: string,
    customerNumber: number,
    seasonName: string,
    invoiceDate: Date
  ): string {
    const yearMonth = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;
    const firstWord = associationName.trim().split(/\s+/)[0] || associationName;
    return `${yearMonth}.${invoiceNumber} - ${firstWord} ${customerNumber} - Nutzung der LeagueSphere App für die Saison ${seasonName}.pdf`;
  }
}
