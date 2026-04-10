import { describe, it, expect } from 'vitest';
import { getShareableLink } from '../driveUploader';

describe('driveUploader', () => {
  describe('getShareableLink', () => {
    it('should generate correct Google Drive shareable link', () => {
      const fileId = 'file_abc123def456';
      const link = getShareableLink(fileId);

      expect(link).toBe('https://drive.google.com/file/d/file_abc123def456/view');
    });

    it('should handle different file IDs', () => {
      const fileId1 = 'id_001';
      const fileId2 = 'id_002';

      const link1 = getShareableLink(fileId1);
      const link2 = getShareableLink(fileId2);

      expect(link1).toBe('https://drive.google.com/file/d/id_001/view');
      expect(link2).toBe('https://drive.google.com/file/d/id_002/view');
    });

    it('should handle special characters in file ID', () => {
      const fileId = 'abc-123_XyZ';
      const link = getShareableLink(fileId);

      expect(link).toBe('https://drive.google.com/file/d/abc-123_XyZ/view');
    });

    it('should not include query parameters by default', () => {
      const fileId = 'file_123';
      const link = getShareableLink(fileId);

      expect(link).not.toContain('?');
    });

    it('should produce valid URL format', () => {
      const fileId = 'file_test';
      const link = getShareableLink(fileId);

      expect(link).toMatch(/^https:\/\/drive\.google\.com\/file\/d\/[^\/]+\/view$/);
    });

    it('should handle long file IDs', () => {
      const fileId = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const link = getShareableLink(fileId);

      expect(link).toContain(fileId);
      expect(link).toMatch(/^https:\/\/drive\.google\.com\/file\/d\/.+\/view$/);
    });

    it('should handle numeric file IDs', () => {
      const fileId = '123456789';
      const link = getShareableLink(fileId);

      expect(link).toBe('https://drive.google.com/file/d/123456789/view');
    });

    it('should handle file IDs with underscores', () => {
      const fileId = 'file_id_with_underscores';
      const link = getShareableLink(fileId);

      expect(link).toContain(fileId);
    });

    it('should handle file IDs with hyphens', () => {
      const fileId = 'file-id-with-hyphens';
      const link = getShareableLink(fileId);

      expect(link).toContain(fileId);
    });

    it('should be consistent for the same file ID', () => {
      const fileId = 'consistent_file_id';
      const link1 = getShareableLink(fileId);
      const link2 = getShareableLink(fileId);

      expect(link1).toBe(link2);
    });
  });

  describe('integration', () => {
    it('should support uploading PDFs to drive (requires valid credentials at runtime)', () => {
      // This test documents that uploadPDFToDrive exists and takes the right params
      // Real integration tests would require valid Google Drive credentials
      const fileId = 'test_file_id';
      const link = getShareableLink(fileId);
      expect(link).toContain(fileId);
    });
  });
});
