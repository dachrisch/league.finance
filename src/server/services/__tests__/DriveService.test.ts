import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DriveService } from '../DriveService';

const mockSetCredentials = vi.fn();
const mockCreate = vi.fn();
const mockGet = vi.fn();
const mockList = vi.fn();

// Mock googleapis
vi.mock('googleapis', () => {
  class MockOAuth2 {
    setCredentials = mockSetCredentials;
  }

  return {
    google: {
      auth: {
        OAuth2: MockOAuth2,
      },
      drive: vi.fn(() => ({
        files: {
          create: mockCreate,
          get: mockGet,
          list: mockList,
        },
      })),
    },
    drive_v3: {},
  };
});

import { google } from 'googleapis';

describe('DriveService', () => {
  let driveService: DriveService;

  beforeEach(() => {
    vi.clearAllMocks();
    driveService = new DriveService('test-access-token');
  });

  describe('constructor', () => {
    it('sets credentials on auth instance', () => {
      expect(mockSetCredentials).toHaveBeenCalledWith({
        access_token: 'test-access-token',
      });
    });

    it('initializes Drive API client', () => {
      const googleDrive = google.drive as any;
      expect(googleDrive).toHaveBeenCalledWith({
        version: 'v3',
        auth: expect.any(Object),
      });
    });
  });

  describe('uploadFile', () => {
    it('uploads PDF file and returns fileId and webViewLink', async () => {
      const mockFileBuffer = Buffer.from('PDF content');
      const mockResponse = {
        data: {
          id: 'file-123',
          webViewLink: 'https://drive.google.com/file/d/file-123/view',
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const result = await driveService.uploadFile(mockFileBuffer, 'test.pdf', 'folder-123');

      expect(result).toEqual({
        fileId: 'file-123',
        webViewLink: 'https://drive.google.com/file/d/file-123/view',
      });
    });

    it('uploads file with correct parameters and a readable stream body', async () => {
      const mockFileBuffer = Buffer.from('PDF content');
      const mockResponse = {
        data: {
          id: 'file-123',
          webViewLink: 'https://drive.google.com/file/d/file-123/view',
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      await driveService.uploadFile(mockFileBuffer, 'test.pdf', 'folder-123');

      const arg = mockCreate.mock.calls[0][0];
      expect(arg.requestBody).toEqual({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        parents: ['folder-123'],
      });
      expect(arg.media.mimeType).toBe('application/pdf');
      expect(arg.fields).toBe('id, webViewLink');
      // googleapis requires a readable stream for media.body, not a Buffer
      expect(typeof arg.media.body.pipe).toBe('function');
      expect(Buffer.isBuffer(arg.media.body)).toBe(false);
    });

    it('throws error if fileId is missing from response', async () => {
      const mockFileBuffer = Buffer.from('PDF content');
      const mockResponse = {
        data: {
          webViewLink: 'https://drive.google.com/file/d/file-123/view',
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      await expect(driveService.uploadFile(mockFileBuffer, 'test.pdf', 'folder-123')).rejects.toThrow(
        'Failed to get file ID from Drive response'
      );
    });

    it('handles API errors gracefully', async () => {
      const mockFileBuffer = Buffer.from('PDF content');
      const mockError = new Error('API Error');

      mockCreate.mockRejectedValueOnce(mockError);

      await expect(driveService.uploadFile(mockFileBuffer, 'test.pdf', 'folder-123')).rejects.toThrow(
        'Drive upload failed: API Error'
      );
    });
  });

  describe('createShareableLink', () => {
    it('returns webViewLink for a file', async () => {
      const mockResponse = {
        data: {
          webViewLink: 'https://drive.google.com/file/d/file-123/view',
        },
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await driveService.createShareableLink('file-123');

      expect(result).toBe('https://drive.google.com/file/d/file-123/view');
    });

    it('requests file with correct fields', async () => {
      const mockResponse = {
        data: {
          webViewLink: 'https://drive.google.com/file/d/file-123/view',
        },
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      await driveService.createShareableLink('file-123');

      expect(mockGet).toHaveBeenCalledWith({
        fileId: 'file-123',
        fields: 'webViewLink',
      });
    });

    it('returns empty string if webViewLink is missing', async () => {
      const mockResponse = {
        data: {},
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await driveService.createShareableLink('file-123');

      expect(result).toBe('');
    });

    it('throws error on API failure', async () => {
      const mockError = new Error('File not found');

      mockGet.mockRejectedValueOnce(mockError);

      await expect(driveService.createShareableLink('file-123')).rejects.toThrow(
        'Failed to create shareable link: File not found'
      );
    });
  });

  describe('validateFolder', () => {
    it('returns true for valid folder', async () => {
      const mockResponse = {
        data: {
          id: 'folder-123',
          mimeType: 'application/vnd.google-apps.folder',
        },
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await driveService.validateFolder('folder-123');

      expect(result).toBe(true);
    });

    it('returns false for non-folder file', async () => {
      const mockResponse = {
        data: {
          id: 'file-123',
          mimeType: 'application/pdf',
        },
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await driveService.validateFolder('file-123');

      expect(result).toBe(false);
    });

    it('returns false for 404 error', async () => {
      const mockError = new Error('Not found');
      (mockError as any).status = 404;

      mockGet.mockRejectedValueOnce(mockError);

      const result = await driveService.validateFolder('nonexistent-folder');

      expect(result).toBe(false);
    });

    it('throws error for non-404 API errors', async () => {
      const mockError = new Error('Unauthorized');
      (mockError as any).status = 401;

      mockGet.mockRejectedValueOnce(mockError);

      await expect(driveService.validateFolder('folder-123')).rejects.toThrow(
        'Failed to validate folder: Unauthorized'
      );
    });

    it('requests folder with correct fields', async () => {
      const mockResponse = {
        data: {
          id: 'folder-123',
          mimeType: 'application/vnd.google-apps.folder',
        },
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      await driveService.validateFolder('folder-123');

      expect(mockGet).toHaveBeenCalledWith({
        fileId: 'folder-123',
        fields: 'id, mimeType',
      });
    });
  });

  describe('listFolders', () => {
    it('maps Drive folders to { id, name }', async () => {
      mockList.mockResolvedValueOnce({
        data: { files: [{ id: 'f1', name: 'Offers' }, { id: 'f2', name: 'Archive' }] },
      });

      const result = await driveService.listFolders();

      expect(result).toEqual([
        { id: 'f1', name: 'Offers' },
        { id: 'f2', name: 'Archive' },
      ]);
    });

    it('preserves the auth status (401) so callers can map expired credentials', async () => {
      const mockError = new Error('Request had invalid authentication credentials.');
      (mockError as any).status = 401;
      mockList.mockRejectedValueOnce(mockError);

      await expect(driveService.listFolders()).rejects.toMatchObject({
        message: expect.stringContaining('Failed to list folders'),
        status: 401,
      });
    });

    it('falls back to err.code when err.status is absent', async () => {
      const mockError = new Error('unauthorized');
      (mockError as any).code = 401;
      mockList.mockRejectedValueOnce(mockError);

      await expect(driveService.listFolders()).rejects.toMatchObject({ status: 401 });
    });
  });
});
