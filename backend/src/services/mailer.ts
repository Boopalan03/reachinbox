import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter: nodemailer.Transporter | null = null;
let isInitialized = false;

export const initializeTransporters = async () => {
  if (isInitialized) return;

  // Initialize Transporter using credentials from .env
  const port = Number(process.env.SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: port,
    secure: port === 465,
    pool: true,
    maxConnections: 5,
    auth: { 
      user: process.env.SMTP_USER || 'skw6adzyygyup6dq@ethereal.email', 
      pass: process.env.SMTP_PASSWORD || '2WnHgSdZwVySMmUJCR' 
    },
  });

  isInitialized = true;
  console.log('✅ Initialized Ethereal transporter');
};

export const sendEmail = async (
  to: string, 
  subject: string, 
  body: string,
  attachments?: { filename: string; path: string }[]
): Promise<{ messageId: string; previewUrl: string | false }> => {
  await initializeTransporters();

  console.log(`📤 Sending email to ${to} via Ethereal`);

  const info = await transporter!.sendMail({
    from: `"ReachInbox Test" <${process.env.SMTP_USER || 'noreply@ethereal.email'}>`,
    to,
    subject,
    html: body,
    attachments: attachments?.map(att => ({
      filename: att.filename,
      path: att.path,
    })),
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  return { messageId: info.messageId, previewUrl: previewUrl || false };
};
