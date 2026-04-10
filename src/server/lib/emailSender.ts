import nodemailer from 'nodemailer';

export async function sendOfferEmail(
  to: string[],
  cc: string[] = [],
  bcc: string[] = [],
  subject: string,
  htmlBody: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'localhost',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: process.env.EMAIL_USER
      ? {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@leagues.finance',
    to: to.join(','),
    cc: cc.length > 0 ? cc.join(',') : undefined,
    bcc: bcc.length > 0 ? bcc.join(',') : undefined,
    subject,
    html: htmlBody,
  });
}
