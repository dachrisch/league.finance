import { Job } from 'bull';
import { Invoice } from '../models/Invoice';
import { Contact } from '../models/Contact';
import { Association } from '../models/Association';
import { InvoiceLineItem } from '../models/InvoiceLineItem';
import { PdfService, InvoicePdfGenerationData } from '../services/PdfService';
import { DriveService } from '../services/DriveService';
import { getMysqlPool } from '../db/mysql';
import { resolveSeasonName } from '../lib/seasonName';

export interface FileInvoiceJobData {
  invoiceId: string;
  userId: string;
  driveFolderId: string;
  accessToken: string;
}

export class FileInvoiceJobHandler {
  static async process(job: Job<FileInvoiceJobData>) {
    const { invoiceId, driveFolderId, accessToken } = job.data;

    try {
      job.progress(10);
      job.log(`Filing invoice ${invoiceId}`);

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      const [contact, association, lineItemDocs] = await Promise.all([
        Contact.findById(invoice.contactId),
        Association.findById(invoice.associationId),
        InvoiceLineItem.find({ invoiceId: invoice._id }).sort({ createdAt: 1 }),
      ]);
      if (!contact) throw new Error('Contact not found');
      const associationName = association?.name || 'Unknown Association';

      const pool = getMysqlPool();
      let leaguesMap: Record<number, string> = {};
      try {
        const [rows] = await pool.query<any[]>(
          'SELECT id, name FROM gamedays_league WHERE id IN (?)',
          [lineItemDocs.map((li: any) => li.leagueId)]
        );
        leaguesMap = rows.reduce((acc: Record<number, string>, row: any) => {
          acc[row.id] = row.name;
          return acc;
        }, {});
      } catch (err) {
        console.warn('Failed to fetch league names:', err);
      }
      const seasonName = await resolveSeasonName(pool, invoice.seasonId);

      job.progress(20);
      job.log('Generating PDF...');
      const pdfData: InvoicePdfGenerationData = {
        invoice: {
          _id: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          servicePeriod: invoice.servicePeriod,
          customerNumber: invoice.customerNumber,
          discount: invoice.discount ?? null,
        },
        associationName,
        contact: { name: contact.name, address: contact.address },
        lineItems: lineItemDocs.map((li: any) => ({
          leagueName: leaguesMap[li.leagueId] || 'Unknown League',
          amount: li.amount,
        })),
        seasonName,
      };
      const pdfBuffer = await PdfService.generateInvoicePdf(pdfData);
      const filename = PdfService.generateInvoiceFilename(
        invoice.invoiceNumber, associationName, invoice.customerNumber, seasonName, invoice.invoiceDate
      );

      job.progress(40);
      job.log('Uploading to Google Drive...');
      const driveService = new DriveService(accessToken);
      const folderValid = await driveService.validateFolder(driveFolderId);
      if (!folderValid) throw new Error('Invalid or inaccessible Drive folder');

      const { fileId, webViewLink } = await driveService.uploadFile(pdfBuffer, filename, driveFolderId);

      invoice.status = 'sent';
      invoice.driveMetadata = {
        driveFileId: fileId,
        driveFolderId,
        driveLink: webViewLink,
        filedAt: new Date(),
      };
      invoice.sendJobId = undefined;
      invoice.sendJobAttempts = 0;
      await invoice.save();

      job.progress(100);
      job.log('Invoice filed in Drive');
      return { success: true as const, driveLink: webViewLink };
    } catch (err: any) {
      job.log(`Error: ${err.message}`);
      try {
        const invoice = await Invoice.findById(invoiceId);
        if (invoice) {
          invoice.driveMetadata = {
            ...invoice.driveMetadata,
            driveFolderId,
            failureReason: err.message,
            lastAttempt: new Date(),
          };
          invoice.sendJobAttempts = (invoice.sendJobAttempts || 0) + 1;
          invoice.sendJobId = undefined;
          await invoice.save();
        }
      } catch (updateErr) {
        console.error('Failed to update invoice with error:', updateErr);
      }
      throw err;
    }
  }
}
