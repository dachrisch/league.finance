import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Invoice } from '../../models/Invoice';
import { Contact } from '../../models/Contact';
import { Association } from '../../models/Association';
import { InvoiceLineItem } from '../../models/InvoiceLineItem';
import { PdfService } from '../../services/PdfService';
import { DriveService } from '../../services/DriveService';
import { getMysqlPool } from '../../db/mysql';
import { FileInvoiceJobHandler } from '../FileInvoiceJob';

vi.mock('../../services/SheetsService');

import { SheetsService } from '../../services/SheetsService';

vi.mock('../../models/Invoice');
vi.mock('../../models/Contact');
vi.mock('../../models/Association');
vi.mock('../../models/InvoiceLineItem');
vi.mock('../../services/PdfService');
vi.mock('../../services/DriveService');
vi.mock('../../db/mysql');

const makeJob = () => ({
  data: { invoiceId: 'i1', userId: 'u1', driveFolderId: 'fold1', accessToken: 'ya29.x' },
  progress: vi.fn(),
  log: vi.fn(),
});

const makeInvoice = (overrides: any = {}) => ({
  _id: 'i1', contactId: 'c1', associationId: 'a1', seasonId: 6,
  invoiceNumber: '20260810-01', invoiceDate: new Date('2026-08-10'), servicePeriod: '8.2026',
  customerNumber: 10010, discount: null, save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockUpload = vi.fn();
const mockValidate = vi.fn();
const mockUpdateInvoiceState = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (DriveService as any).mockImplementation(function () {
    return { uploadFile: mockUpload, validateFolder: mockValidate };
  });
  mockValidate.mockResolvedValue(true);
  mockUpload.mockResolvedValue({ fileId: 'file1', webViewLink: 'https://drive/file1' });
  mockUpdateInvoiceState.mockResolvedValue(undefined);
  (SheetsService as any).mockImplementation(function () {
    return { updateInvoiceState: mockUpdateInvoiceState };
  });
  vi.mocked(PdfService.generateInvoicePdf).mockResolvedValue(Buffer.from('PDF'));
  vi.mocked(PdfService.generateInvoiceFilename).mockReturnValue('invoice.pdf');
  vi.mocked(Contact.findById).mockResolvedValue({
    name: 'Fabian Pawlowski', address: { street: 'Halterner Straße 193', postalCode: '45770', city: 'Marl' },
  } as any);
  vi.mocked(Association.findById).mockResolvedValue({ name: 'AFCV NRW' } as any);
  vi.mocked(InvoiceLineItem.find).mockReturnValue({
    sort: () => Promise.resolve([{ leagueId: 16, amount: 648 }]),
  } as any);
  vi.mocked(getMysqlPool).mockReturnValue({
    query: (sql: string) =>
      /gamedays_season/i.test(sql)
        ? Promise.resolve([[{ name: '2026' }]])
        : Promise.resolve([[{ id: 16, name: 'Regionalliga' }]]),
  } as any);
});

describe('FileInvoiceJobHandler', () => {
  it('uploads the PDF to Drive', async () => {
    vi.mocked(Invoice.findById).mockResolvedValue(makeInvoice() as any);
    const res = await FileInvoiceJobHandler.process(makeJob() as any);
    expect(mockUpload).toHaveBeenCalledWith(expect.any(Buffer), 'invoice.pdf', 'fold1');
    expect(res).toEqual({ success: true, driveLink: 'https://drive/file1' });
  });

  it('resolves league names from MySQL and passes them with amounts to the PDF', async () => {
    vi.mocked(Invoice.findById).mockResolvedValue(makeInvoice() as any);
    await FileInvoiceJobHandler.process(makeJob() as any);
    expect(PdfService.generateInvoicePdf).toHaveBeenCalledWith(
      expect.objectContaining({ lineItems: [{ leagueName: 'Regionalliga', amount: 648 }] })
    );
  });

  it('resolves the season name from gamedays_season and passes it to the PDF', async () => {
    vi.mocked(Invoice.findById).mockResolvedValue(makeInvoice() as any);
    await FileInvoiceJobHandler.process(makeJob() as any);
    expect(PdfService.generateInvoicePdf).toHaveBeenCalledWith(
      expect.objectContaining({ seasonName: '2026' })
    );
  });

  it('passes invoice meta (number, date, servicePeriod, customerNumber) to the PDF and filename', async () => {
    vi.mocked(Invoice.findById).mockResolvedValue(makeInvoice() as any);
    await FileInvoiceJobHandler.process(makeJob() as any);
    expect(PdfService.generateInvoicePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice: expect.objectContaining({ invoiceNumber: '20260810-01', customerNumber: 10010 }),
      })
    );
    expect(PdfService.generateInvoiceFilename).toHaveBeenCalledWith(
      '20260810-01', 'AFCV NRW', 10010, '2026', expect.any(Date)
    );
  });

  it('on success sets status=sent and writes driveMetadata', async () => {
    const invoice = makeInvoice();
    vi.mocked(Invoice.findById).mockResolvedValue(invoice as any);
    await FileInvoiceJobHandler.process(makeJob() as any);
    expect(invoice.status).toBe('sent');
    expect(invoice.driveMetadata.driveFileId).toBe('file1');
    expect(invoice.driveMetadata.driveLink).toBe('https://drive/file1');
    expect(invoice.save).toHaveBeenCalled();
  });

  it('on upload failure records driveMetadata.failureReason, rethrows, and leaves status untouched', async () => {
    const invoice = makeInvoice({ status: 'draft' });
    vi.mocked(Invoice.findById).mockResolvedValue(invoice as any);
    mockUpload.mockRejectedValueOnce(new Error('boom'));
    await expect(FileInvoiceJobHandler.process(makeJob() as any)).rejects.toThrow('boom');
    expect(invoice.driveMetadata.failureReason).toBe('boom');
    expect(invoice.status).toBe('draft');
  });

  it('syncs the new status to the Sheets ledger on success', async () => {
    vi.mocked(Invoice.findById).mockResolvedValue(makeInvoice() as any);
    await FileInvoiceJobHandler.process(makeJob() as any);
    expect(mockUpdateInvoiceState).toHaveBeenCalledWith('20260810-01', 'sent');
  });

  it('still succeeds when the Sheets sync call rejects, and records sheetSync.lastError', async () => {
    const invoice = makeInvoice();
    vi.mocked(Invoice.findById).mockResolvedValue(invoice as any);
    mockUpdateInvoiceState.mockRejectedValueOnce(new Error('Sheets API down'));
    const res = await FileInvoiceJobHandler.process(makeJob() as any);
    expect(res).toEqual({ success: true, driveLink: 'https://drive/file1' });
    expect(invoice.sheetSync.lastError).toBe('Sheets API down');
  });
});