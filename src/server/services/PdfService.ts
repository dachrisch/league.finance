import puppeteer from 'puppeteer';
import { Offer } from '../models/Offer';
import { Contact } from '../models/Contact';
import { FinancialConfig } from '../models/FinancialConfig';
import { getMysqlPool } from '../db/mysql';

export interface PdfGenerationData {
  offer: any;
  contact: any;
  configs: any[];
  leaguesMap: Record<number, string>;
  associationName: string;
  seasonName: string;
}

export class PdfService {
  private static async launchBrowser() {
    return puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  static async generateOfferPdf(data: PdfGenerationData): Promise<Buffer> {
    const browser = await this.launchBrowser();

    try {
      const page = await browser.newPage();
      const html = this.generateHtml(data);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfData = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });
      // Convert Uint8Array to Buffer
      return Buffer.from(pdfData);
    } finally {
      await browser.close();
    }
  }

  private static generateHtml(data: PdfGenerationData): string {
    const {
      offer,
      contact,
      configs,
      leaguesMap,
      associationName,
      seasonName,
    } = data;

    const leaguePricingRows = configs
      .map(
        (config) =>
          `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${leaguesMap[config.leagueId] || 'Unknown'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${config.expectedTeamsCount} Teams</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${config.finalPrice.toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const totalPrice = configs.reduce((sum, c) => sum + (c.finalPrice || 0), 0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #333;
      line-height: 1.6;
    }
    .header {
      margin-bottom: 40px;
      border-bottom: 3px solid #2c5aa0;
      padding-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2c5aa0;
      margin-bottom: 10px;
    }
    .company-info {
      font-size: 11px;
      color: #666;
    }
    .recipient-section {
      margin-bottom: 30px;
    }
    .recipient-section h3 {
      margin: 0 0 10px 0;
      font-size: 12px;
      font-weight: bold;
      color: #666;
    }
    .recipient-info {
      font-size: 13px;
      line-height: 1.6;
    }
    .title {
      font-size: 18px;
      font-weight: bold;
      margin: 30px 0 10px 0;
      color: #2c5aa0;
    }
    .offer-meta {
      font-size: 11px;
      color: #666;
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #2c5aa0;
      margin: 20px 0 10px 0;
      border-bottom: 2px solid #f0ad4e;
      padding-bottom: 5px;
    }
    .section-content {
      font-size: 13px;
      margin-bottom: 15px;
    }
    .pricing-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 13px;
    }
    .pricing-table th {
      background-color: #f5f5f5;
      padding: 10px 8px;
      text-align: left;
      border-bottom: 2px solid #2c5aa0;
      font-weight: bold;
    }
    .total-row {
      font-weight: bold;
      background-color: #f9f9f9;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 11px;
      color: #666;
    }
    .footer-section {
      margin-bottom: 15px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">bumbleflies</div>
    <div class="company-info">
      bumbleflies UG (haftungsbeschränkt) · Gleiwitzer Str. 6d · 81929 München
    </div>
  </div>

  <div class="recipient-section">
    <h3>OFFER TO:</h3>
    <div class="recipient-info">
      <strong>${contact.name}</strong><br/>
      ${contact.street}<br/>
      ${contact.postalCode} ${contact.city}<br/>
      ${contact.country}<br/>
      ${contact.email}
    </div>
  </div>

  <div class="title">
    Angebot: ${offer._id.toString().substring(0, 8)} - Nutzung der LeagueSphere App für die Saison ${seasonName}
  </div>

  <div class="offer-meta">
    <strong>Offer ID:</strong> ${offer._id.toString().substring(0, 8)}<br/>
    <strong>Date:</strong> ${new Date().toLocaleDateString('de-DE')}<br/>
    <strong>Organization:</strong> ${associationName}
  </div>

  <div class="section-title">Unser Angebot</div>
  <div class="section-content">
    Wir freuen uns, dir unser Angebot für die Nutzung der LeagueSphere App zur effizienten
    Organisation und Verwaltung der Saison ${seasonName} zu unterbreiten.
  </div>

  <div class="section-title">Leistungsumfang</div>
  <div class="section-content">
    Die Anwendung kann unter https://leaguesphere.app von allen Spieler:innen und
    Zuschauer:innen genutzt werden, mit folgenden Funktionen:
    <ul style="margin: 10px 0; padding-left: 20px;">
      <li>Einfache Spielplanerstellung und Einteilung der Offiziellen</li>
      <li>Live-Ergebnisse für die Fans und Teams</li>
      <li>Liveticker für die Fans</li>
      <li>Tracking der Schiedsrichtereinsätze</li>
      <li>Digitalen Passcheck der Teams ohne Listen zu drucken</li>
      <li>Automatischer digitaler Passtransfer innerhalb der App</li>
    </ul>
  </div>

  <div class="section-title">Preise und Konditionen</div>
  <table class="pricing-table">
    <thead>
      <tr>
        <th>Liga/League</th>
        <th style="text-align: right;">Teams</th>
        <th style="text-align: right;">Price (€)</th>
      </tr>
    </thead>
    <tbody>
      ${leaguePricingRows}
      <tr class="total-row">
        <td colspan="2" style="padding: 10px 8px;">TOTAL (excl. VAT)</td>
        <td style="padding: 10px 8px; text-align: right;">€${totalPrice.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-content">
    Alle oben genannten Preise verstehen sich zzgl. der gesetzlichen MwSt.
    <br/><br/>
    Wir binden uns an dieses Angebot bis zum ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE')}.
  </div>

  <div style="margin-top: 40px;">
    <strong>Viele Grüße</strong>
    <br/><br/>
    bumbleflies (i.V. Christian Dähn)
  </div>

  <div class="footer">
    <div class="footer-section">
      bumbleflies UG (haftungsbeschränkt)<br/>
      Geschäftsführer: Christoph Kämpfe, Christian Dähn, Sebastian Keller<br/>
      Gleiwitzer Str. 6d, 81929 München
    </div>
    <div class="footer-section">
      Bank: GLS Bank<br/>
      IBAN: DE96430609671106170600<br/>
      E-mail: info@bumbleflies.de<br/>
      Web: bumbleflies.de
    </div>
  </div>
</body>
</html>
    `;
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
