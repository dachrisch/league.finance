import PDFDocument from 'pdfkit';
import { buildLineDescriptions } from '../../../shared/lib/invoiceDescriptions';
import { computeLineVat, computeInvoiceTotals } from '../lib/invoicePricing';
import { buildStandardInvoiceAddress } from '../lib/invoiceAddress';
import { BUMBLEFLIES_LOGO_PNG_DATA_URI } from '../assets/bumbleflies-logo';
import { offerLinesTotal, type OfferLine } from '../../../shared/lib/offerLines';

export interface PdfGenerationData {
  offerNumber: string;
  offerDate: Date;
  validUntil: Date;
  introNote?: string;
  closingNote?: string;
  recipient: { associationName: string; contactName?: string; street: string; postalCode: string; city: string };
  lines: OfferLine[];
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

/**
 * Absolute positions (A4 points) of the legacy Google Docs offer letter, measured with
 * pdftotext -bbox from Angebot_20260319-2 (2026). Text y is the top of the line box.
 */
const OFFER_LAYOUT = {
  left: 43.1,
  logo: { x: 424.5, y: 22.1, width: 127 },
  senderY: 50.6,
  recipient: { x: 42.3, y: 82.1, lineHeight: 15.2 },
  meta: { right: 561.3, y: 82.1, lineHeight: 12.4 },
  titleY: 163.4,
  firstHeadingY: 198.7,
  bodyWidth: 501,
  lineHeight: 15.2,
  headingGapBefore: 10,
  headingGapAfter: 29.2,
  /** space between the Leistungsumfang intro and its bullets, and after the bullets */
  bulletsGapBefore: 12,
  bulletsGapAfter: 2,
  bullet: { x: 61.1, textX: 79.1 },
  priceColumns: { label: 79.1, labelWidth: 104, detail: 187.1, detailWidth: 200, amountRight: 470 },
  /** body content must end above this; the footer starts at footerY */
  contentBottom: 770,
  continuationTopY: 50,
  footerY: 784.8,
  footerLineHeight: 8.4,
  footerColumns: [49.1, 217.8, 386.6] as const,
};

const OFFER_FEATURES = [
  'Einfache Spielplanerstellung und Einteilung der Offiziellen',
  'Live-Ergebnisse für die Fans und Teams',
  'Liveticker für die Fans',
  'Tracking der Schiedsrichtereinsätze',
  'Digitalen Passcheck der Teams ohne Listen zu drucken',
  'Automatischer digitaler Passtransfer innerhalb der App',
];

/** Width of the box right-aligned text is laid into; only its right edge matters. */
const RIGHT_ALIGN_BOX = 150;

const euro = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
/** Invoice dates as the legacy invoices print them (unpadded, e.g. 29.5.2026). */
const deDate = (d: Date) => d.toLocaleDateString('de-DE');
/**
 * Offer letter dates as the legacy letters print them (01.10.2026). Formatted in UTC so the
 * date always agrees with the YYYYMMDD part of the offer number (generateOfferNumber uses UTC).
 */
const offerDate = (d: Date) =>
  d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

export class PdfService {
  /**
   * Renders an offer as the legacy Google Docs letter (logo, address/meta header, three
   * sections, bullet price lines, footer) so app offers look like the ones sent before.
   */
  static generateOfferPdf(data: PdfGenerationData): Promise<Buffer> {
    const L = OFFER_LAYOUT;
    // No margins: every element is placed absolutely; page breaks are handled by ensure().
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const font = (size: number, bold = false) => doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    const line = (str: string, x: number, y: number, size: number, bold = false, opts: PDFKit.Mixins.TextOptions = {}) =>
      font(size, bold).text(str, x, y, { lineBreak: false, ...opts });
    const right = (str: string, rightEdge: number, y: number, size: number, bold = false) =>
      line(str, rightEdge - RIGHT_ALIGN_BOX, y, size, bold, { width: RIGHT_ALIGN_BOX, align: 'right' });
    /** Wrapped 11pt text whose lines are L.lineHeight apart, like the original. */
    const wrapOpts = (width: number): PDFKit.Mixins.TextOptions => {
      font(11);
      return { width, lineGap: L.lineHeight - doc.currentLineHeight(true) };
    };

    const drawFooter = () => {
      const cols: Array<[number, string[]]> = [
        [L.footerColumns[0], ['bumbleflies UG (haftungsbeschränkt)', 'Geschäftsführer: Christoph Kämpfe,',
          'Christian Dähn, Sebastian Keller', 'Gleiwitzer-Str-6d', '81929 München']],
        [L.footerColumns[1], ['Bank: GLS Bank', 'IBAN: DE96430609671106170600', 'HRB-Nr.: 260473']],
        [L.footerColumns[2], ['E-mail: info@bumbleflies.de', 'Web: bumbleflies.de']],
      ];
      for (const [x, rows] of cols) rows.forEach((r, i) => line(r, x, L.footerY + i * L.footerLineHeight, 7));
    };

    let y = 0;
    /** Continue on a new page when the next block would run into the footer. */
    const ensure = (height: number) => {
      if (y + height > L.contentBottom) {
        drawFooter();
        doc.addPage({ size: 'A4', margin: 0 });
        y = L.continuationTopY;
      }
    };
    /** Wrapped paragraph at the body width; advances y. */
    const paragraph = (str: string) => {
      const opts = wrapOpts(L.bodyWidth);
      const h = Math.max(doc.heightOfString(str, opts), L.lineHeight);
      ensure(h);
      doc.text(str, L.left, y, opts);
      y += h;
    };
    const heading = (str: string) => {
      y += L.headingGapBefore;
      ensure(L.headingGapAfter + L.lineHeight);
      line(str, L.left, y, 14, true);
      y += L.headingGapAfter;
    };

    const { recipient: r, lines, seasonName } = data;
    const total = offerLinesTotal(lines);
    const regular = lines.filter((l) => l.kind !== 'optional');
    const optional = lines.filter((l) => l.kind === 'optional');

    doc.fillColor('black');

    // Header: logo, sender line, recipient (left) and meta block (right)
    doc.image(BUMBLEFLIES_LOGO_PNG_DATA_URI, L.logo.x, L.logo.y, { width: L.logo.width });
    line('bumbleflies UG (haftungsbeschränkt) · Gleiwitzer Str. 6d · 81929 München', L.left, L.senderY, 7);
    const recipientLines = [r.associationName, r.contactName ? `z.H. ${r.contactName}` : '',
      r.street, `${r.postalCode} ${r.city}`.trim()].filter(Boolean);
    recipientLines.forEach((s, i) => line(s, L.recipient.x, L.recipient.y + i * L.recipient.lineHeight, 11));
    ['info@bumbleflies.de', `Angebot: ${data.offerNumber}`, `Datum: ${offerDate(data.offerDate)}`]
      .forEach((s, i) => right(s, L.meta.right, L.meta.y + i * L.meta.lineHeight, 9));

    line(`Angebot: ${data.offerNumber} - Nutzung der LeagueSphere App für die Saison ${seasonName}`,
      L.left, L.titleY, 14, true);

    // Unser Angebot
    y = L.firstHeadingY - L.headingGapBefore;
    heading('Unser Angebot');
    paragraph('Wir freuen uns, dir unser Angebot für die Nutzung der LeagueSphere App zur effizienten Organisation ' +
      `und Verwaltung der Saison ${seasonName} zu unterbreiten. Unsere Plattform hilft dir dabei, die Spielplanung, ` +
      'die Verwaltung von Offiziellen und die Kommunikation mit Fans und Teams zu optimieren.');
    if (data.introNote) paragraph(data.introNote);

    // Leistungsumfang
    heading('Leistungsumfang');
    paragraph('Die Anwendung kann unter https://leaguesphere.app von allen Spieler:innen und Zuschauer:innen ' +
      'genutzt werden, mit folgenden Funktionen:');
    y += L.bulletsGapBefore;
    for (const f of OFFER_FEATURES) {
      ensure(L.lineHeight);
      line('•', L.bullet.x, y, 11);
      line(f, L.bullet.textX, y, 11);
      y += L.lineHeight;
    }
    y += L.bulletsGapAfter;

    // Preise und Konditionen
    heading('Preise und Konditionen');
    paragraph(`Für die Nutzung der LeagueSphere App in der Saison ${seasonName} berechnen wir ${euro(total)}, ` +
      'die sich wie folgt zusammensetzen:');
    const C = L.priceColumns;
    const priceRow = (l: OfferLine) => {
      const labelOpts = wrapOpts(C.labelWidth);
      const detailOpts = wrapOpts(C.detailWidth);
      const h = Math.max(
        doc.heightOfString(l.label, labelOpts),
        l.detail ? doc.heightOfString(l.detail, detailOpts) : 0,
        L.lineHeight);
      ensure(h);
      line('•', L.bullet.x, y, 11);
      doc.text(l.label, C.label, y, labelOpts);
      if (l.detail) doc.text(l.detail, C.detail, y, detailOpts);
      right(euro(l.amount), C.amountRight, y, 11);
      y += h;
    };
    regular.forEach(priceRow);
    ensure(L.lineHeight + 4);
    doc.moveTo(C.label, y + 1).lineTo(C.amountRight, y + 1).lineWidth(0.5).strokeColor('black').stroke();
    y += 4;
    line('Gesamt (zzgl. MwSt.)', C.label, y, 11, true);
    right(euro(total), C.amountRight, y, 11, true);
    y += L.lineHeight;
    if (optional.length) {
      y += 6;
      ensure(L.lineHeight * 2);
      line('Optional:', L.left, y, 11, true);
      y += L.lineHeight;
      optional.forEach(priceRow);
    }

    // Closing notes and sign-off
    y += L.lineHeight;
    if (data.closingNote) paragraph(data.closingNote);
    paragraph('Alle oben genannten Preise verstehen sich zzgl. der gesetzlichen MwSt.');
    y += L.lineHeight;
    paragraph(`Wir binden uns an dieses Angebot bis zum ${offerDate(data.validUntil)} und freuen uns auf die Zusammenarbeit.`);
    y += L.lineHeight;
    // keep greeting and signature together
    ensure(L.lineHeight * 5);
    paragraph('Viele Grüße');
    y += 45;
    paragraph('bumbleflies (i.V. Christian Dähn)');

    drawFooter();
    doc.end();
    return done;
  }

  /** The legacy Google Docs file name, e.g. "Angebot_20261001-1-Nutzung der … Saison 2027.pdf". */
  static generateFilename(offerNumber: string, seasonName: string): string {
    return `Angebot_${offerNumber}-Nutzung der LeagueSphere App für die Saison ${seasonName}.pdf`;
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
    doc.image(BUMBLEFLIES_LOGO_PNG_DATA_URI, L.logo.x, L.logo.y, { width: L.logo.width });
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
