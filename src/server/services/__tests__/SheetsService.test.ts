import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SheetsService } from '../SheetsService';

const mockSetCredentials = vi.fn();
const mockGet = vi.fn();
const mockAppend = vi.fn();
const mockUpdate = vi.fn();

vi.mock('googleapis', () => {
  class MockOAuth2 {
    setCredentials = mockSetCredentials;
  }
  return {
    google: {
      auth: { OAuth2: MockOAuth2 },
      sheets: vi.fn(() => ({
        spreadsheets: { values: { get: mockGet, append: mockAppend, update: mockUpdate } },
      })),
    },
  };
});

import { google } from 'googleapis';

describe('SheetsService', () => {
  let service: SheetsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SheetsService('test-access-token');
  });

  describe('constructor', () => {
    it('sets credentials and initializes the Sheets API client', () => {
      expect(mockSetCredentials).toHaveBeenCalledWith({ access_token: 'test-access-token' });
      expect(google.sheets as any).toHaveBeenCalledWith({ version: 'v4', auth: expect.any(Object) });
    });
  });

  describe('upsertClientRow', () => {
    it('appends a new row when the clientId is not found', async () => {
      mockGet.mockResolvedValue({ data: { values: [['clientId'], [10001], [10002]] } });
      mockAppend.mockResolvedValue({});
      await service.upsertClientRow({
        clientId: 10010, clientName: 'AFCV NRW',
        standardInvoiceAddress: 'AFCV NRW\nz.H. Fabian Pawlowski\nHalterner Straße 193\n45770 Marl',
      });
      expect(mockAppend).toHaveBeenCalledWith(expect.objectContaining({
        range: 'clientData!A:D',
        requestBody: {
          values: [[10010, 'AFCV NRW', 'AFCV NRW\nz.H. Fabian Pawlowski\nHalterner Straße 193\n45770 Marl', '']],
        },
      }));
    });

    it('updates the existing row in place when the clientId is found', async () => {
      mockGet.mockResolvedValue({ data: { values: [['clientId'], [10001], [10010], [10012]] } });
      mockUpdate.mockResolvedValue({});
      await service.upsertClientRow({ clientId: 10010, clientName: 'AFCV NRW (updated)', standardInvoiceAddress: 'new address' });
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        range: 'clientData!A3:C3',
        requestBody: { values: [[10010, 'AFCV NRW (updated)', 'new address']] },
      }));
      expect(mockAppend).not.toHaveBeenCalled();
    });
  });

  describe('appendInvoiceRows', () => {
    it('appends one row to invoiceData and one row per line item to invoicePositions', async () => {
      mockAppend.mockResolvedValue({});
      await service.appendInvoiceRows(
        {
          invoiceId: '20260810-01', clientId: 10010, invoiceAddress: 'addr',
          invoiceName: 'Nutzung der LeagueSphere App für die Saison 2026',
          invoiceDate: '10.8.2026', jobPeriod: '8.2026', paymentTerm: 30, state: 'draft',
          netSum: 1904, grossSum: 2265.76, vatSum: 361.76,
        },
        [{
          invoiceId: '20260810-01', position: 1, description: 'LeagueSphere App Saison 2026 - Regionalliga',
          quantity: 1, net: 648, vat: '19%', netSum: 648, vatAmount: 123.12, grossSum: 771.12, jobPeriod: '8.2026',
        }]
      );
      expect(mockAppend).toHaveBeenCalledWith(expect.objectContaining({ range: 'invoiceData!A:O' }));
      expect(mockAppend).toHaveBeenCalledWith(expect.objectContaining({ range: 'invoicePositions!A:J' }));
    });

    it('skips the invoicePositions append when there are no line items', async () => {
      mockAppend.mockResolvedValue({});
      await service.appendInvoiceRows(
        {
          invoiceId: '20260810-01', clientId: 10010, invoiceAddress: 'a', invoiceName: 'n',
          invoiceDate: 'd', jobPeriod: 'j', paymentTerm: 30, state: 'draft', netSum: 0, grossSum: 0, vatSum: 0,
        },
        []
      );
      expect(mockAppend).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateInvoiceState', () => {
    it('updates the state cell of the matching row', async () => {
      mockGet.mockResolvedValue({ data: { values: [['invoiceId'], ['20260101-01'], ['20260810-01']] } });
      mockUpdate.mockResolvedValue({});
      await service.updateInvoiceState('20260810-01', 'sent');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        range: 'invoiceData!I3',
        requestBody: { values: [['sent']] },
      }));
    });

    it('does nothing when the invoiceId is not found', async () => {
      mockGet.mockResolvedValue({ data: { values: [['invoiceId'], ['20260101-01']] } });
      await service.updateInvoiceState('missing', 'sent');
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
