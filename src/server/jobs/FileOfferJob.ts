import { Job } from 'bull';
import { Offer } from '../models/Offer';
import { Contact } from '../models/Contact';
import { Association } from '../models/Association';
import { PdfService, PdfGenerationData } from '../services/PdfService';
import { DriveService } from '../services/DriveService';
import { getMysqlPool } from '../db/mysql';

export interface FileOfferJobData {
  offerId: string;
  userId: string;
  driveFolderId: string;
  accessToken: string;
  /** Line items with prices already resolved at enqueue time; the PDF only renders them. */
  configs: any[];
}

export class FileOfferJobHandler {
  static async process(job: Job<FileOfferJobData>) {
    const { offerId, driveFolderId, accessToken, configs } = job.data;

    try {
      job.progress(10);
      job.log(`Filing offer ${offerId}`);

      const offer = await Offer.findById(offerId);
      if (!offer) throw new Error('Offer not found');

      const contact = await Contact.findById(offer.contactId);
      if (!contact) throw new Error('Contact not found');

      const association = await Association.findById(offer.associationId);
      const associationName = association?.name || 'Unknown Association';

      let leaguesMap: Record<number, string> = {};
      try {
        const pool = getMysqlPool();
        const [rows] = await pool.query<any[]>(
          'SELECT id, name FROM gamedays_league WHERE id IN (?)',
          [configs.map((c) => c.leagueId)]
        );
        leaguesMap = rows.reduce((acc, row) => {
          acc[row.id] = row.name;
          return acc;
        }, {});
      } catch (err) {
        console.warn('Failed to fetch league names:', err);
      }

      // Resolve the season's display name (the year string, e.g. "2026"); fall back to the id.
      let seasonName = `${offer.seasonId}`;
      try {
        const pool = getMysqlPool();
        const [rows] = await pool.query<any[]>(
          'SELECT name FROM gamedays_season WHERE id = ?',
          [offer.seasonId]
        );
        if (rows[0]?.name != null) seasonName = `${rows[0].name}`;
      } catch (err) {
        console.warn('Failed to fetch season name:', err);
      }

      // Step 1: Generate PDF
      job.progress(20);
      job.log('Generating PDF...');
      const pdfData: PdfGenerationData = {
        offer,
        contact,
        configs,
        leaguesMap,
        associationName,
        seasonName,
      };
      const pdfBuffer = await PdfService.generateOfferPdf(pdfData);
      const filename = PdfService.generateFilename(offer._id.toString(), associationName);

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
