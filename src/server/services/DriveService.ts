import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

export interface UploadResult {
  fileId: string;
  webViewLink: string;
}

export class DriveService {
  private drive: drive_v3.Drive;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.drive = google.drive({ version: 'v3', auth });
  }

  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    folderId: string
  ): Promise<UploadResult> {
    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: filename,
          mimeType: 'application/pdf',
          parents: [folderId],
        },
        media: {
          mimeType: 'application/pdf',
          body: Readable.from(fileBuffer),
        },
        fields: 'id, webViewLink',
      });

      if (!response.data.id) {
        throw new Error('Failed to get file ID from Drive response');
      }

      return {
        fileId: response.data.id,
        webViewLink: response.data.webViewLink || '',
      };
    } catch (err: any) {
      throw new Error(`Drive upload failed: ${err.message}`);
    }
  }

  async createShareableLink(fileId: string): Promise<string> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'webViewLink',
      });

      return response.data.webViewLink || '';
    } catch (err: any) {
      throw new Error(`Failed to create shareable link: ${err.message}`);
    }
  }

  async validateFolder(folderId: string): Promise<boolean> {
    try {
      const response = await this.drive.files.get({
        fileId: folderId,
        fields: 'id, mimeType',
      });

      return response.data.mimeType === 'application/vnd.google-apps.folder';
    } catch (err: any) {
      if (err.status === 404) return false;
      throw new Error(`Failed to validate folder: ${err.message}`);
    }
  }

  async listFolders(): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await this.drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)',
        orderBy: 'name',
      });

      return (response.data.files || []).map((f) => ({
        id: f.id || '',
        name: f.name || 'Untitled Folder',
      }));
    } catch (err: any) {
      throw new Error(`Failed to list folders: ${err.message}`);
    }
  }
}
