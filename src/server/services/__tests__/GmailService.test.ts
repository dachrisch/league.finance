import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GmailService } from '../GmailService';

const mockSetCredentials = vi.fn();
const mockSend = vi.fn();

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
      gmail: vi.fn(() => ({
        users: {
          messages: {
            send: mockSend,
          },
        },
      })),
    },
    gmail_v1: {},
  };
});

// Mock emailTemplate
vi.mock('../../lib/emailTemplate', () => ({
  generateOfferEmailSubject: (associationName: string, seasonName: string) =>
    `Offer: ${associationName} - ${seasonName} Season`,
  generateOfferEmailBody: (
    associationName: string,
    seasonName: string,
    leagueNames: string[],
    totalPrice: number,
    driveLink: string
  ) =>
    `<html><body><h2>Offer for ${associationName}</h2><p>Leagues: ${leagueNames.join(', ')}</p><p>Price: $${totalPrice}</p><a href="${driveLink}">View</a></body></html>`,
}));

import { google } from 'googleapis';

describe('GmailService', () => {
  let gmailService: GmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    gmailService = new GmailService('test-access-token');
  });

  describe('constructor', () => {
    it('sets credentials on auth instance', () => {
      expect(mockSetCredentials).toHaveBeenCalledWith({
        access_token: 'test-access-token',
      });
    });

    it('initializes Gmail API client', () => {
      const googleGmail = google.gmail as any;
      expect(googleGmail).toHaveBeenCalledWith({
        version: 'v1',
        auth: expect.any(Object),
      });
    });
  });

  describe('sendEmail', () => {
    it('sends email with correct parameters', async () => {
      const mockResponse = {
        data: {
          id: 'message-123',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const params = {
        to: 'test@example.com',
        associationName: 'Test Association',
        seasonName: '2024',
        leagueNames: ['League A', 'League B'],
        totalPrice: 1500,
        driveLink: 'https://drive.google.com/file/d/file-123/view',
      };

      const result = await gmailService.sendEmail(params);

      expect(result).toEqual({ messageId: 'message-123' });
    });

    it('calls Gmail API with raw message', async () => {
      const mockResponse = {
        data: {
          id: 'message-123',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const params = {
        to: 'test@example.com',
        associationName: 'Test Association',
        seasonName: '2024',
        leagueNames: ['League A'],
        totalPrice: 1500,
        driveLink: 'https://drive.google.com/file/d/file-123/view',
      };

      await gmailService.sendEmail(params);

      expect(mockSend).toHaveBeenCalledWith({
        userId: 'me',
        requestBody: {
          raw: expect.any(String),
        },
      });
    });

    it('generates correct email subject', async () => {
      const mockResponse = {
        data: {
          id: 'message-123',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const params = {
        to: 'test@example.com',
        associationName: 'Test Association',
        seasonName: '2024',
        leagueNames: ['League A'],
        totalPrice: 1500,
        driveLink: 'https://drive.google.com/file/d/file-123/view',
      };

      await gmailService.sendEmail(params);

      const rawMessage = mockSend.mock.calls[0][0].requestBody.raw;
      const decodedMessage = Buffer.from(rawMessage, 'base64').toString('utf-8');

      expect(decodedMessage).toContain('Subject: Offer: Test Association - 2024 Season');
    });

    it('includes correct recipients in email', async () => {
      const mockResponse = {
        data: {
          id: 'message-123',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const params = {
        to: 'recipient@example.com',
        associationName: 'Test Association',
        seasonName: '2024',
        leagueNames: ['League A'],
        totalPrice: 1500,
        driveLink: 'https://drive.google.com/file/d/file-123/view',
      };

      await gmailService.sendEmail(params);

      const rawMessage = mockSend.mock.calls[0][0].requestBody.raw;
      const decodedMessage = Buffer.from(rawMessage, 'base64').toString('utf-8');

      expect(decodedMessage).toContain('To: recipient@example.com');
    });

    it('includes HTML content type in message', async () => {
      const mockResponse = {
        data: {
          id: 'message-123',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const params = {
        to: 'test@example.com',
        associationName: 'Test Association',
        seasonName: '2024',
        leagueNames: ['League A'],
        totalPrice: 1500,
        driveLink: 'https://drive.google.com/file/d/file-123/view',
      };

      await gmailService.sendEmail(params);

      const rawMessage = mockSend.mock.calls[0][0].requestBody.raw;
      const decodedMessage = Buffer.from(rawMessage, 'base64').toString('utf-8');

      expect(decodedMessage).toContain('Content-Type: text/html');
    });

    it('includes drive link in email body', async () => {
      const mockResponse = {
        data: {
          id: 'message-123',
        },
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const params = {
        to: 'test@example.com',
        associationName: 'Test Association',
        seasonName: '2024',
        leagueNames: ['League A'],
        totalPrice: 1500,
        driveLink: 'https://drive.google.com/file/d/file-123/view',
      };

      await gmailService.sendEmail(params);

      const rawMessage = mockSend.mock.calls[0][0].requestBody.raw;
      const decodedMessage = Buffer.from(rawMessage, 'base64').toString('utf-8');

      expect(decodedMessage).toContain('https://drive.google.com/file/d/file-123/view');
    });

    it('throws error if messageId is missing from response', async () => {
      const mockResponse = {
        data: {},
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const params = {
        to: 'test@example.com',
        associationName: 'Test Association',
        seasonName: '2024',
        leagueNames: ['League A'],
        totalPrice: 1500,
        driveLink: 'https://drive.google.com/file/d/file-123/view',
      };

      await expect(gmailService.sendEmail(params)).rejects.toThrow(
        'Failed to get message ID from Gmail response'
      );
    });

    it('handles API errors gracefully', async () => {
      const mockError = new Error('API Error');

      mockSend.mockRejectedValueOnce(mockError);

      const params = {
        to: 'test@example.com',
        associationName: 'Test Association',
        seasonName: '2024',
        leagueNames: ['League A'],
        totalPrice: 1500,
        driveLink: 'https://drive.google.com/file/d/file-123/view',
      };

      await expect(gmailService.sendEmail(params)).rejects.toThrow(
        'Gmail send failed: API Error'
      );
    });
  });

  describe('htmlToPlainText', () => {
    it('strips HTML tags from content', () => {
      // Access private method through any cast for testing
      const result = (gmailService as any).htmlToPlainText(
        '<html><body><p>Hello World</p></body></html>'
      );

      expect(result).toBe('Hello World');
    });

    it('converts HTML to readable plain text', () => {
      const result = (gmailService as any).htmlToPlainText(
        '<p>&lt;tag&gt; &quot;quoted&quot; &nbsp;spaced</p>'
      );

      // html-to-text properly converts entities and removes HTML markup
      expect(result).toContain('<tag>');
      expect(result).toContain('"quoted"');
      expect(result).toContain('spaced');
      // Actual HTML tags are removed
      expect(result).not.toContain('<p>');
    });

    it('handles multiple nested tags', () => {
      const result = (gmailService as any).htmlToPlainText(
        '<div><p>Line 1</p><p>Line 2</p></div>'
      );

      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('trims whitespace from result', () => {
      const result = (gmailService as any).htmlToPlainText('   <p>Content</p>   ');

      expect(result).toBe('Content');
    });

    it('handles empty HTML', () => {
      const result = (gmailService as any).htmlToPlainText('<html></html>');

      expect(result).toBe('');
    });
  });

  describe('createMessage', () => {
    it('creates RFC 2822 compliant message', () => {
      const message = (gmailService as any).createMessage({
        to: 'test@example.com',
        subject: 'Test Subject',
        htmlBody: '<p>Test Body</p>',
      });

      const decodedMessage = Buffer.from(message, 'base64').toString('utf-8');

      expect(decodedMessage).toContain('To: test@example.com');
      expect(decodedMessage).toContain('Subject: Test Subject');
      expect(decodedMessage).toContain('MIME-Version: 1.0');
      expect(decodedMessage).toContain('multipart/alternative');
    });

    it('encodes message in base64url format', () => {
      const message = (gmailService as any).createMessage({
        to: 'test@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
      });

      // Base64url should not contain + or / characters
      expect(message).not.toContain('+');
      expect(message).not.toContain('/');

      // Should be decodable from base64
      expect(() => Buffer.from(message, 'base64')).not.toThrow();
    });

    it('includes both plain text and HTML versions', () => {
      const message = (gmailService as any).createMessage({
        to: 'test@example.com',
        subject: 'Test',
        htmlBody: '<html><body><h1>Hello</h1><p>World</p></body></html>',
      });

      const decodedMessage = Buffer.from(message, 'base64').toString('utf-8');

      expect(decodedMessage).toContain('Content-Type: text/plain');
      expect(decodedMessage).toContain('Content-Type: text/html');
    });

    it('generates correct boundary separator', () => {
      const message = (gmailService as any).createMessage({
        to: 'test@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
      });

      const decodedMessage = Buffer.from(message, 'base64').toString('utf-8');

      // Should contain boundary lines (starts and ends with --)
      const boundaryMatch = decodedMessage.match(/--===============\d+==--/);
      expect(boundaryMatch).not.toBeNull();
    });
  });
});
