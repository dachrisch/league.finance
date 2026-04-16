import { Job } from 'bull';
import { Offer } from '../models/Offer';
import { Contact } from '../models/Contact';
import { FinancialConfig } from '../models/FinancialConfig';
import { Association } from '../models/Association';
import { PdfService, PdfGenerationData } from '../services/PdfService';
import { DriveService } from '../services/DriveService';
import { GmailService, SendEmailParams } from '../services/GmailService';
import { getMysqlPool } from '../db/mysql';

export interface SendOfferJobData {
  offerId: string;
  userId: string;
  driveFolderId: string;
  recipientEmail: string;
  accessToken: string;
}

export class SendOfferJobHandler {
  static async process(job: Job<SendOfferJobData>) {
    const { offerId, userId, driveFolderId, recipientEmail, accessToken } =
      job.data;

    try {
      job.progress(10);
      job.log(`Starting job for offer ${offerId}`);

      // Fetch offer and related data
      const offer = await Offer.findById(offerId);
      if (!offer) throw new Error('Offer not found');

      const contact = await Contact.findById(offer.contactId);
      if (!contact) throw new Error('Contact not found');

      const association = await Association.findById(offer.associationId);
      const associationName = association?.name || 'Unknown Association';

      // Fetch configs
      const configs = await FinancialConfig.find({ offerId }).lean();

      // Fetch league names from MySQL
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

      // Step 1: Generate PDF
      job.progress(20);
      job.log('Generating PDF...');

      const pdfData: PdfGenerationData = {
        offer,
        contact,
        configs,
        leaguesMap,
        associationName,
        seasonName: `${offer.seasonId}`,
      };

      const pdfBuffer = await PdfService.generateOfferPdf(pdfData);
      const filename = PdfService.generateFilename(
        offer._id.toString(),
        associationName
      );

      job.progress(40);

      // Step 2: Upload to Drive
      job.log('Uploading to Google Drive...');

      const driveService = new DriveService(accessToken);

      // Validate folder exists
      const folderValid = await driveService.validateFolder(driveFolderId);
      if (!folderValid) {
        throw new Error('Invalid or inaccessible Drive folder');
      }

      const { fileId, webViewLink } = await driveService.uploadFile(
        pdfBuffer,
        filename,
        driveFolderId
      );

      job.progress(65);

      // Step 3: Send email
      job.log('Sending email...');

      const gmailService = new GmailService(accessToken);
      const leagueNames = configs.map((c) => leaguesMap[c.leagueId] || 'Unknown');
      const totalPrice = configs.reduce((sum, c) => sum + (c.finalPrice || 0), 0);

      const emailParams: SendEmailParams = {
        to: recipientEmail,
        associationName,
        seasonName: `${offer.seasonId}`,
        leagueNames,
        totalPrice,
        driveLink: webViewLink,
      };

      const { messageId } = await gmailService.sendEmail(emailParams);

      job.progress(85);

      // Update offer with metadata
      offer.status = 'sent';
      offer.sentAt = new Date();
      (offer as any).emailMetadata = {
        sentVia: 'gmail',
        messageId,
        driveFileId: fileId,
        driveFolderId,
        driveLink: webViewLink,
        recipientEmail,
        sentAt: new Date(),
      };
      (offer as any).sendJobId = undefined;
      (offer as any).sendJobAttempts = 0;

      await offer.save();

      job.progress(100);
      job.log('Offer sent successfully');

      return {
        success: true,
        driveLink: webViewLink,
        messageId,
      };
    } catch (err: any) {
      job.log(`Error: ${err.message}`);

      // Update offer with failure metadata
      try {
        const offer = await Offer.findById(offerId);
        if (offer) {
          (offer as any).emailMetadata = {
            ...(offer as any).emailMetadata,
            failureReason: err.message,
            lastSendAttempt: new Date(),
          };
          (offer as any).sendJobAttempts = ((offer as any).sendJobAttempts || 0) + 1;
          (offer as any).sendJobId = undefined;
          await offer.save();
        }
      } catch (updateErr) {
        console.error('Failed to update offer with error:', updateErr);
      }

      throw err;
    }
  }
}
