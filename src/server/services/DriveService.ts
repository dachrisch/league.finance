import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Readable } from 'stream';

export class DriveService {
  static async uploadOfferPdf(
    pdfBuffer: Buffer,
    filename: string,
    folderId: string,
    accessToken: string
  ) {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth });

    const readableStream = new Readable();
    readableStream.push(pdfBuffer);
    readableStream.push(null);

    const response = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
        mimeType: 'application/pdf',
      },
      media: {
        mimeType: 'application/pdf',
        body: readableStream,
      },
      fields: 'id, webViewLink',
    });

    const fileId = response.data.id;
    if (!fileId) throw new Error('Drive upload failed - no file ID returned');

    // Make the file shareable (viewable with link)
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      fileId,
      webViewLink: response.data.webViewLink,
    };
  }

  static async listFolders(accessToken: string) {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    return response.data.files || [];
  }
}
