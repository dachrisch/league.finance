import PDFDocument from 'pdfkit';

export interface PdfGenerationData {
  offer: any;
  contact: any;
  configs: any[];
  leaguesMap: Record<number, string>;
  associationName: string;
  seasonName: string;
}

const BLUE = '#2c5aa0';
const GREY = '#666666';
const DARK = '#333333';

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
}
