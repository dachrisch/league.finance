import { Job } from 'bull';
import { Offer } from '../models/Offer';
import { Contact } from '../models/Contact';
import { FinancialConfig } from '../models/FinancialConfig';
import { PdfService } from '../services/PdfService';
import { DriveService } from '../services/DriveService';
import { GmailService } from '../services/GmailService';
import { AuthService } from '../services/AuthService';
import { getMysqlPool } from '../db/mysql';

export interface SendOfferJobData {
  offerId: string;
  userId: string;
  driveFolderId: string;
  recipientEmail: string;
}

export const processSendOfferJob = async (job: Job<SendOfferJobData>) => {
  const { offerId, userId, driveFolderId, recipientEmail } = job.data;

  try {
    // 1. Fetch data
    const offer = await Offer.findById(offerId);
    if (!offer) throw new Error(`Offer ${offerId} not found`);

    const contact = await Contact.findById(offer.contactId);
    if (!contact) throw new Error(`Contact ${offer.contactId} not found`);

    const configs = await FinancialConfig.find({ offerId });
    
    // Fetch league names from MySQL
    let leaguesMap: Record<number, string> = {};
    try {
      const pool = getMysqlPool();
      const [rows] = await pool.query<any[]>('SELECT id, name FROM gamedays_league');
      leaguesMap = rows.reduce((acc, row) => {
        acc[row.id] = row.name;
        return acc;
      }, {});
    } catch (err) {
      console.error('Failed to fetch league names from MySQL:', err);
    }

    // 2. Update status to 'sending'
    offer.status = 'sending';
    offer.sendJobId = job.id.toString();
    offer.sendJobAttempts = (offer.sendJobAttempts || 0) + 1;
    await offer.save();

    job.progress(10); // Start

    // 3. Generate PDF
    job.progress(20);
    const pdfData = {
      associationName: 'League Association', // Placeholder - should fetch from Association model if needed
      seasonName: `Season ${offer.seasonId}`,
      contactName: contact.name,
      contactAddress: `${contact.address.street}, ${contact.address.postalCode} ${contact.address.city}, ${contact.address.country}`,
      offerId: offer._id.toString(),
      date: new Date().toLocaleDateString('de-DE'),
      leagues: configs.map(c => {
        const baseRate = c.baseRateOverride ?? 50;
        const price = c.customPrice ?? (
          c.costModel === 'SEASON' 
            ? baseRate * (c.expectedTeamsCount || 0)
            : baseRate * (c.expectedGamedaysCount || 0) * (c.expectedTeamsPerGameday || 0)
        );
        return {
          name: leaguesMap[c.leagueId] || `League ${c.leagueId}`,
          price,
        };
      }),
      totalPrice: configs.reduce((sum, c) => {
        const baseRate = c.baseRateOverride ?? 50;
        return sum + (c.customPrice ?? (
          c.costModel === 'SEASON' 
            ? baseRate * (c.expectedTeamsCount || 0)
            : baseRate * (c.expectedGamedaysCount || 0) * (c.expectedTeamsPerGameday || 0)
        ));
      }, 0),
    };

    const pdfBuffer = await PdfService.generateOfferPdf(pdfData);
    job.progress(40);

    // 4. Get Google Access Token
    const accessToken = await AuthService.getGoogleAccessToken(userId);
    job.progress(50);

    // 5. Upload to Drive
    const filename = `Angebot_${new Date().toISOString().split('T')[0]}_${offer._id.toString().slice(-6)}.pdf`;
    const driveResult = await DriveService.uploadOfferPdf(
      pdfBuffer,
      filename,
      driveFolderId,
      accessToken
    );
    job.progress(70);

    // 6. Send Email via Gmail
    const subject = `Offer: ${pdfData.associationName} - ${pdfData.seasonName}`;
    const htmlBody = `
      <p>Dear ${contact.name},</p>
      <p>Please find our offer for the upcoming ${pdfData.seasonName} attached.</p>
      <p>You can also access the PDF directly on Google Drive: <a href="${driveResult.webViewLink}">${driveResult.webViewLink}</a></p>
      <p>Best regards,<br>The bumbleflies Team</p>
    `;
    
    const gmailResult = await GmailService.sendOfferEmail(
      recipientEmail,
      subject,
      htmlBody,
      driveResult.webViewLink!,
      accessToken
    );
    job.progress(90);

    // 7. Success! Update offer
    offer.status = 'sent';
    offer.sentAt = new Date();
    offer.emailMetadata = {
      sentVia: 'gmail',
      messageId: gmailResult.messageId!,
      driveFileId: driveResult.fileId!,
      driveFolderId: driveFolderId,
      driveLink: driveResult.webViewLink!,
      recipientEmail: recipientEmail,
      sentAt: new Date(),
    };
    await offer.save();
    
    job.progress(100);
    return { success: true, driveLink: driveResult.webViewLink };

  } catch (error: any) {
    console.error(`Error in SendOfferJob for offer ${offerId}:`, error);
    
    // Update offer with failure reason
    try {
      const offer = await Offer.findById(offerId);
      if (offer) {
        offer.status = 'draft'; // Revert to draft so it can be retried
        if (!offer.emailMetadata) {
          offer.emailMetadata = {
            sentVia: 'gmail',
            recipientEmail: recipientEmail,
            sentAt: new Date(),
          };
        }
        offer.emailMetadata.failureReason = error.message;
        offer.emailMetadata.lastSendAttempt = new Date();
        await offer.save();
      }
    } catch (saveErr) {
      console.error('Failed to save error status to offer:', saveErr);
    }
    
    throw error; // Let Bull handle the retry
  }
};
