import { google, sheets_v4 } from 'googleapis';

/** The business's existing manual invoice ledger ("Debitoren und Ausgangsrechnungen (gestellt)"). */
const SPREADSHEET_ID = '1yLKEp-dQw7Etz6n-XVoRi8nPXGhLqFcDVcTN6nVrLlk';

export interface ClientRow {
  clientId: number;
  clientName: string;
  standardInvoiceAddress: string;
}

export interface InvoiceLineRow {
  invoiceId: string;
  position: number;
  description: string;
  quantity: number;
  net: number;
  vat: string;
  netSum: number;
  vatAmount: number;
  grossSum: number;
  jobPeriod: string;
}

export interface InvoiceHeaderRow {
  invoiceId: string;
  clientId: number;
  invoiceAddress: string;
  invoiceName: string;
  invoiceDate: string;
  jobPeriod: string;
  paymentTerm: number;
  state: string;
  netSum: number;
  grossSum: number;
  vatSum: number;
}

export class SheetsService {
  private sheets: sheets_v4.Sheets;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  /** Finds a client in the "clientData" tab by clientId. Returns { clientName, standardInvoiceAddress } if found. */
  async findClientByClientId(clientId: number): Promise<{ clientName: string; standardInvoiceAddress: string } | null> {
    const existing = await this.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'clientData!A:C',
    });
    const rows = existing.data.values || [];
    for (let i = 1; i < rows.length; i++) { // skip header row
      if (String(rows[i][0]) === String(clientId)) {
        return {
          clientName: rows[i][1] || '',
          standardInvoiceAddress: rows[i][2] || '',
        };
      }
    }
    return null;
  }

  /** Upserts a row in the "clientData" tab, matched by clientId in column A. */
  async upsertClientRow(row: ClientRow): Promise<void> {
    const existing = await this.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'clientData!A:A',
    });
    const ids = (existing.data.values || []).map((r) => r[0]);
    const rowIndex = ids.findIndex((id) => String(id) === String(row.clientId));

    if (rowIndex === -1) {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'clientData!A:D',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[row.clientId, row.clientName, row.standardInvoiceAddress, '']] },
      });
      return;
    }

    // rowIndex is 0-based and includes the header row, so the sheet row number is rowIndex + 1.
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `clientData!A${rowIndex + 1}:C${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[row.clientId, row.clientName, row.standardInvoiceAddress]] },
    });
  }

  /** Appends one row to "invoiceData" and one row per line item to "invoicePositions". */
  async appendInvoiceRows(header: InvoiceHeaderRow, lines: InvoiceLineRow[]): Promise<void> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'invoiceData!A:O',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          header.invoiceId, header.clientId, header.invoiceAddress, header.invoiceName,
          header.invoiceDate, header.jobPeriod, '€', header.paymentTerm, header.state,
          '', header.netSum, header.grossSum, header.vatSum, '', '',
        ]],
      },
    });

    if (lines.length === 0) return;

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'invoicePositions!A:J',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: lines.map((l) => [
          l.invoiceId, l.position, l.description, l.quantity, l.net, l.vat,
          l.netSum, l.vatAmount, l.grossSum, l.jobPeriod,
        ]),
      },
    });
  }

  /** Updates the "state" cell (column I) of the matching invoiceData row. No-op if not found. */
  async updateInvoiceState(invoiceId: string, state: string): Promise<void> {
    const existing = await this.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'invoiceData!A:A',
    });
    const ids = (existing.data.values || []).map((r) => r[0]);
    const rowIndex = ids.findIndex((id) => String(id) === invoiceId);
    if (rowIndex === -1) return;

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `invoiceData!I${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[state]] },
    });
  }
}
