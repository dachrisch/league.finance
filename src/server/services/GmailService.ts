import { google, gmail_v1 } from 'googleapis';
import { convert } from 'html-to-text';
import { generateOfferEmailSubject, generateOfferEmailBody } from '../lib/emailTemplate';

export interface SendEmailParams {
  to: string;
  associationName: string;
  seasonName: string;
  leagueNames: string[];
  totalPrice: number;
  driveLink: string;
}

export class GmailService {
  private gmail: gmail_v1.Gmail;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async sendEmail(params: SendEmailParams): Promise<{ messageId: string }> {
    const {
      to,
      associationName,
      seasonName,
      leagueNames,
      totalPrice,
      driveLink,
    } = params;

    try {
      const subject = generateOfferEmailSubject(associationName, seasonName);
      const htmlBody = generateOfferEmailBody(
        associationName,
        seasonName,
        leagueNames,
        totalPrice,
        driveLink
      );

      const message = this.createMessage({
        to,
        subject,
        htmlBody,
      });

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message,
        },
      });

      if (!response.data.id) {
        throw new Error('Failed to get message ID from Gmail response');
      }

      return { messageId: response.data.id };
    } catch (err: any) {
      throw new Error(`Gmail send failed: ${err.message}`);
    }
  }

  private createMessage(params: {
    to: string;
    subject: string;
    htmlBody: string;
  }): string {
    const { to, subject, htmlBody } = params;

    const boundary = '===============' + Date.now() + '==';
    const email = [
      `To: ${to}`,
      'Subject: ' + subject,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      this.htmlToPlainText(htmlBody),
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      htmlBody,
      `--${boundary}--`,
    ].join('\r\n');

    return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  }

  private htmlToPlainText(html: string): string {
    return convert(html, {
      wordwrap: false,
      selectors: [
        { selector: 'a', options: { ignoreHref: true } },
      ],
    }).trim();
  }
}
