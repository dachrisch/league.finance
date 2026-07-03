// src/server/jobs/__tests__/FileOfferJob.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Offer } from '../../models/Offer';
import { Contact } from '../../models/Contact';
import { Association } from '../../models/Association';
import { FinancialConfig } from '../../models/FinancialConfig';
import { PdfService } from '../../services/PdfService';
import { DriveService } from '../../services/DriveService';
import { getMysqlPool } from '../../db/mysql';
import { FileOfferJobHandler } from '../FileOfferJob';

vi.mock('../../models/Offer');
vi.mock('../../models/Contact');
vi.mock('../../models/Association');
vi.mock('../../models/FinancialConfig');
vi.mock('../../services/PdfService');
vi.mock('../../services/DriveService');
vi.mock('../../db/mysql');

const makeJob = () => ({
  data: {
    offerId: 'o1', userId: 'u1', driveFolderId: 'fold1', accessToken: 'ya29.x',
    configs: [{ leagueId: 16, expectedTeamsCount: 1, finalPrice: 50 }],
  },
  progress: vi.fn(),
  log: vi.fn(),
});

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
  vi.mocked(Contact.findById).mockResolvedValue({} as any);
  vi.mocked(Association.findById).mockResolvedValue({ name: 'AFVB' } as any);
  vi.mocked(FinancialConfig.find).mockReturnValue({ lean: () => Promise.resolve([{ leagueId: 16 }]) } as any);
  vi.mocked(getMysqlPool).mockReturnValue({ query: () => Promise.resolve([[{ id: 16, name: 'RL Bayern' }]]) } as any);
});

describe('FileOfferJobHandler', () => {
  it('uploads the PDF to Drive and never calls Gmail (no Gmail import exists)', async () => {
    const save = vi.fn();
    vi.mocked(Offer.findById).mockResolvedValue({ _id: 'o1', contactId: 'c1', associationId: 'a1', save } as any);
    const res = await FileOfferJobHandler.process(makeJob() as any);
    expect(mockUpload).toHaveBeenCalledWith(expect.any(Buffer), 'offer.pdf', 'fold1');
    expect(res).toEqual({ success: true, driveLink: 'https://drive/file1' });
  });

  it('forwards the priced configs from the job payload to the PDF and does not query FinancialConfig', async () => {
    const save = vi.fn();
    vi.mocked(Offer.findById).mockResolvedValue({ _id: 'o1', contactId: 'c1', associationId: 'a1', save } as any);
    const job = {
      data: {
        offerId: 'o1', userId: 'u1', driveFolderId: 'fold1', accessToken: 'ya29.x',
        configs: [{ leagueId: 16, expectedTeamsCount: 2, finalPrice: 100 }],
      },
      progress: vi.fn(),
      log: vi.fn(),
    };
    await FileOfferJobHandler.process(job as any);
    expect(PdfService.generateOfferPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        configs: [expect.objectContaining({ leagueId: 16, expectedTeamsCount: 2, finalPrice: 100 })],
      })
    );
    expect(FinancialConfig.find).not.toHaveBeenCalled();
  });

  it('on success sets status=sent and writes driveMetadata', async () => {
    const save = vi.fn();
    const offer: any = { _id: 'o1', contactId: 'c1', associationId: 'a1', save };
    vi.mocked(Offer.findById).mockResolvedValue(offer);
    await FileOfferJobHandler.process(makeJob() as any);
    expect(offer.status).toBe('sent');
    expect(offer.driveMetadata.driveFileId).toBe('file1');
    expect(offer.driveMetadata.driveLink).toBe('https://drive/file1');
    expect(save).toHaveBeenCalled();
  });

  it('on upload failure records driveMetadata.failureReason and rethrows', async () => {
    const save = vi.fn();
    const offer: any = { _id: 'o1', contactId: 'c1', associationId: 'a1', status: 'sending', save };
    vi.mocked(Offer.findById).mockResolvedValue(offer);
    mockUpload.mockRejectedValueOnce(new Error('boom'));
    await expect(FileOfferJobHandler.process(makeJob() as any)).rejects.toThrow('boom');
    expect(offer.driveMetadata.failureReason).toBe('boom');
    expect(offer.status).toBe('draft');
  });
});
