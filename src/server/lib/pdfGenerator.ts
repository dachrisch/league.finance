import { launch } from 'puppeteer';

export interface OfferLineItem {
  leagueId: number;
  leagueName: string;
  basePrice: number;
  customPrice: number | null;
  finalPrice: number;
}

export interface OfferPDFData {
  associationName: string;
  seasonName: string;
  createdAt: Date;
  lineItems: OfferLineItem[];
}

export async function generateOfferPDF(data: OfferPDFData): Promise<Buffer> {
  const browser = await launch({ headless: true });
  const page = await browser.newPage();

  const html = generateOfferHTML(data);
  await page.setContent(html);
  const pdfData = await page.pdf({ format: 'A4' });

  await browser.close();

  // Ensure we return a Buffer (Uint8Array from newer puppeteer versions)
  if (Buffer.isBuffer(pdfData)) {
    return pdfData;
  }
  return Buffer.from(pdfData);
}

function generateOfferHTML(data: OfferPDFData): string {
  const totalFinalPrice = data.lineItems.reduce((sum, item) => sum + item.finalPrice, 0);
  const totalBasePrice = data.lineItems.reduce((sum, item) => sum + item.basePrice, 0);

  const tableRows = data.lineItems
    .map(
      (item) => `
    <tr>
      <td>${item.leagueName}</td>
      <td style="text-align: right;">$${item.basePrice.toFixed(2)}</td>
      <td style="text-align: right;">${item.customPrice !== null ? `$${item.customPrice.toFixed(2)}` : '-'}</td>
      <td style="text-align: right;">$${item.finalPrice.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Offer</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          .header { margin-bottom: 30px; }
          .info { margin-bottom: 20px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .totals { font-weight: bold; background-color: #f9f9f9; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.associationName}</h1>
          <p><strong>Season:</strong> ${data.seasonName}</p>
          <p><strong>Generated:</strong> ${data.createdAt.toLocaleDateString()}</p>
        </div>

        <div class="info">
          <p>This offer outlines the pricing for the following leagues:</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>League</th>
              <th style="text-align: right;">Base Price</th>
              <th style="text-align: right;">Custom Price</th>
              <th style="text-align: right;">Final Price</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="totals">
              <td>TOTAL</td>
              <td style="text-align: right;">$${totalBasePrice.toFixed(2)}</td>
              <td style="text-align: right;">-</td>
              <td style="text-align: right;">$${totalFinalPrice.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>This offer is valid for 30 days from the date generated.</p>
          <p>Please contact us for any questions.</p>
        </div>
      </body>
    </html>
  `;
}
