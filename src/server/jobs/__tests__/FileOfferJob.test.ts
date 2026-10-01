// src/server/jobs/__tests__/FileOfferJob.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Offer } from '../../models/Offer';
import { PdfService } from '../../services/PdfService';
import { DriveService } from '../../services/DriveService';
import { buildOfferPdfData } from '../../lib/offerPdfData';
import { FileOfferJobHandler } from '../FileOfferJob';

vi.mock('../../models/Offer');
vi.mock('../../services/PdfService');
vi.mock('../../services/DriveService');
vi.mock('../../lib/offerPdfData');

const makeJob = () => ({
  data: { offerId: 'o1', userId: 'u1', driveFolderId: 'fold1', accessToken: 'ya29.x' },
  progress: vi.fn(),
  log: vi.fn(),
});

const pdfData = {
  offerNumber: '20261001-2',
  offerDate: new Date('2026-10-01'),
  validUntil: new Date('2026-10-31'),
  recipient: { associationName: 'AFVB', contactName: 'Lynn Hoffer', street: 'Georg-Brauchle-Ring 93', postalCode: '80992', city: 'München' },
  lines: [{ label: 'RL Bayern', amount: 50, kind: 'league' as const }],
  seasonName: '2026',
};

const mockUpload = vi.fn();
const mockValidate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (DriveService as any).mockImplementation(function () {
    return {
      uploadFile: mockUpload,
      validateFolder: mockValidate,
    };
  });
  mockValidate.mockResolvedValue(true);
  mockUpload.mockResolvedValue({ fileId: 'file1', webViewLink: 'https://drive/file1' });
  vi.mocked(PdfService.generateOfferPdf).mockResolvedValue(Buffer.from('PDF'));
  vi.mocked(PdfService.generateFilename).mockReturnValue('offer.pdf');
  vi.mocked(buildOfferPdfData).mockResolvedValue(pdfData);
});

describe('FileOfferJobHandler', () => {
  it('uploads the PDF to Drive and never calls Gmail (no Gmail import exists)', async () => {
    const save = vi.fn();
    vi.mocked(Offer.findById).mockResolvedValue({ _id: 'o1', save } as any);
    const res = await FileOfferJobHandler.process(makeJob() as any);
    expect(mockUpload).toHaveBeenCalledWith(expect.any(Buffer), 'offer.pdf', 'fold1');
    expect(res).toEqual({ success: true, driveLink: 'https://drive/file1' });
  });

  it('renders the PDF from buildOfferPdfData and names it by offer number and season', async () => {
    const save = vi.fn();
    vi.mocked(Offer.findById).mockResolvedValue({ _id: 'o1', save } as any);
    await FileOfferJobHandler.process(makeJob() as any);
    expect(buildOfferPdfData).toHaveBeenCalledWith('o1');
    expect(PdfService.generateOfferPdf).toHaveBeenCalledWith(pdfData);
    expect(PdfService.generateFilename).toHaveBeenCalledWith('20261001-2', '2026');
  });

  it('on success sets status=sent and writes driveMetadata', async () => {
    const save = vi.fn();
    const offer: any = { _id: 'o1', save };
    vi.mocked(Offer.findById).mockResolvedValue(offer);
    await FileOfferJobHandler.process(makeJob() as any);
    expect(offer.status).toBe('sent');
    expect(offer.driveMetadata.driveFileId).toBe('file1');
    expect(offer.driveMetadata.driveLink).toBe('https://drive/file1');
    expect(save).toHaveBeenCalled();
  });

  it('on upload failure records driveMetadata.failureReason and rethrows', async () => {
    const save = vi.fn();
    const offer: any = { _id: 'o1', status: 'sending', save };
    vi.mocked(Offer.findById).mockResolvedValue(offer);
    mockUpload.mockRejectedValueOnce(new Error('boom'));
    await expect(FileOfferJobHandler.process(makeJob() as any)).rejects.toThrow('boom');
    expect(offer.driveMetadata.failureReason).toBe('boom');
    expect(offer.status).toBe('draft');
  });

  it('records the failure when the offer data cannot be built', async () => {
    const save = vi.fn();
    const offer: any = { _id: 'o1', status: 'sending', save };
    vi.mocked(Offer.findById).mockResolvedValue(offer);
    vi.mocked(buildOfferPdfData).mockRejectedValueOnce(new Error('Offer not found'));
    await expect(FileOfferJobHandler.process(makeJob() as any)).rejects.toThrow('Offer not found');
    expect(offer.driveMetadata.failureReason).toBe('Offer not found');
  });
});
