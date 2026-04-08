import { google } from 'googleapis';
import { Readable } from 'stream';

export async function uploadPDFToDrive(
  pdfBuffer: Buffer,
  accessToken: string,
  fileName: string
): Promise<string> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const fileMetadata = {
    name: fileName,
    mimeType: 'application/pdf',
    parents: ['appDataFolder'],
  };

  const media = {
    mimeType: 'application/pdf',
    body: Readable.from(pdfBuffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id',
  });

  if (!response.data.id) {
    throw new Error('Failed to upload PDF to Google Drive');
  }

  return response.data.id;
}

export function getShareableLink(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
