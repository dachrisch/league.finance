import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GmailService {
  static async sendOfferEmail(
    to: string,
    subject: string,
    htmlBody: string,
    pdfLink: string,
    accessToken: string
  ) {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    // Gmail API requires a base64url encoded raw MIME message
    const emailContent = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      `${htmlBody}<p>Download offer: <a href="${pdfLink}">${pdfLink}</a></p>`,
    ].join('\r\n');

    const encodedMessage = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return {
      messageId: response.data.id,
      sentAt: new Date(),
    };
  }
}
