import { Job } from 'bull';
import { Offer } from '../models/Offer';
import { PdfService } from '../services/PdfService';
import { DriveService } from '../services/DriveService';
import { buildOfferPdfData } from '../lib/offerPdfData';

export interface FileOfferJobData {
  offerId: string;
  userId: string;
  driveFolderId: string;
  accessToken: string;
}

export class FileOfferJobHandler {
  static async process(job: Job<FileOfferJobData>) {
    const { offerId, driveFolderId, accessToken } = job.data;

    try {
      job.progress(10);
      job.log(`Filing offer ${offerId}`);

      const offer = await Offer.findById(offerId);
      if (!offer) throw new Error('Offer not found');

      // Step 1: Generate PDF (lines, letter metadata and recipient resolved from stored data)
      job.progress(20);
      job.log('Generating PDF...');
      const pdfData = await buildOfferPdfData(offerId);
      const pdfBuffer = await PdfService.generateOfferPdf(pdfData);
      const filename = PdfService.generateFilename(pdfData.offerNumber, pdfData.seasonName);

      // Step 2: Upload to Drive
      job.progress(40);
      job.log('Uploading to Google Drive...');
      const driveService = new DriveService(accessToken);
      const folderValid = await driveService.validateFolder(driveFolderId);
      if (!folderValid) throw new Error('Invalid or inaccessible Drive folder');

      const { fileId, webViewLink } = await driveService.uploadFile(pdfBuffer, filename, driveFolderId);

      // Done
      offer.status = 'sent';
      offer.sentAt = new Date();
      offer.driveMetadata = {
        driveFileId: fileId,
        driveFolderId,
        driveLink: webViewLink,
        filedAt: new Date(),
      };
      offer.sendJobId = undefined;
      offer.sendJobAttempts = 0;
      await offer.save();

      job.progress(100);
      job.log('Offer filed in Drive');
      return { success: true as const, driveLink: webViewLink };
    } catch (err: any) {
      job.log(`Error: ${err.message}`);
      try {
        const offer = await Offer.findById(offerId);
        if (offer) {
          offer.driveMetadata = {
            ...offer.driveMetadata,
            driveFolderId,
            failureReason: err.message,
            lastAttempt: new Date(),
          };
          offer.sendJobAttempts = (offer.sendJobAttempts || 0) + 1;
          offer.sendJobId = undefined;
          offer.status = 'draft';
          await offer.save();
        }
      } catch (updateErr) {
        console.error('Failed to update offer with error:', updateErr);
      }
      throw err;
    }
  }
}
