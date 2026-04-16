import puppeteer from 'puppeteer';

export interface PdfData {
  associationName: string;
  seasonName: string;
  contactName: string;
  contactAddress: string;
  offerId: string;
  date: string;
  leagues: {
    name: string;
    price: number;
  }[];
  totalPrice: number;
}

export class PdfService {
  static async generateOfferPdf(data: PdfData): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    try {
      const page = await browser.newPage();
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: bold; color: #f0ad4e; }
            .recipient { margin-bottom: 40px; }
            .offer-info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #ddd; padding: 12px; text-align: left; }
            .total { margin-top: 20px; text-align: right; font-size: 18px; font-weight: bold; }
            .footer { margin-top: 60px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">bumbleflies</div>
            <div>Offer #${data.offerId}</div>
          </div>
          
          <div class="recipient">
            <strong>${data.contactName}</strong><br>
            ${data.contactAddress.replace(/\n/g, '<br>')}
          </div>
          
          <div class="offer-info">
            <h1>Offer for ${data.associationName}</h1>
            <p>Season: ${data.seasonName}</p>
            <p>Date: ${data.date}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>League</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              ${data.leagues.map(l => `
                <tr>
                  <td>${l.name}</td>
                  <td>€${l.price.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total">
            Total Price: €${data.totalPrice.toFixed(2)} (excl. VAT)
          </div>
          
          <div class="footer">
            <p>bumbleflies UG (haftungsbeschränkt) | Berlin, Germany</p>
            <p>This offer is valid for 30 days.</p>
          </div>
        </body>
        </html>
      `;
      
      await page.setContent(htmlContent);
      const pdfBuffer = await page.pdf({ format: 'A4' });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
