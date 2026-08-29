import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import { sendEmail } from '../services/mailer';
import { enqueueEmailBatch, type EmailJobData } from '../services/queueService';

// ────────────── Send Now (single email, immediate) ──────────────
export const sendNow = async (req: AuthRequest, res: Response) => {
  try {
    const { to, subject, content } = req.body;
    const userId = req.userId!;

    // Validate required fields
    if (!to || typeof to !== 'string') {
      return res.status(400).json({ error: 'A valid "to" email address is required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return res.status(400).json({ error: 'Subject is required.' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Email content is required.' });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const attachmentsData = files.map(f => ({
      filename: f.originalname,
      path: f.path,
      size: f.size,
      mimeType: f.mimetype,
    }));

    // Save record first
    const emailRecord = await prisma.email.create({
      data: {
        userId,
        recipient: to,
        subject: subject.trim(),
        body: content,
        scheduledAt: new Date(),
        status: 'PROCESSING',
        attachments: {
          create: attachmentsData,
        }
      },
    });

    try {
      const result = await sendEmail(to, subject, content, attachmentsData);

      await prisma.email.update({
        where: { id: emailRecord.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId: result.messageId,
          previewUrl: result.previewUrl ? String(result.previewUrl) : null,
        },
      });

      return res.status(200).json({
        message: 'Email sent successfully!',
        messageId: result.messageId,
        previewUrl: result.previewUrl || null,
      });
    } catch (smtpError: any) {
      await prisma.email.update({
        where: { id: emailRecord.id },
        data: { status: 'FAILED', errorMessage: smtpError.message },
      });
      return res.status(502).json({ error: `SMTP error: ${smtpError.message}` });
    }
  } catch (error: any) {
    console.error('Error in sendNow:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ────────────── Save Draft ──────────────
export const saveDraft = async (req: AuthRequest, res: Response) => {
  try {
    const { to, subject, content } = req.body;
    const userId = req.userId!;

    if (!to || typeof to !== 'string') {
      return res.status(400).json({ error: 'A valid "to" email address is required.' });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const attachmentsData = files.map(f => ({
      filename: f.originalname,
      path: f.path,
      size: f.size,
      mimeType: f.mimetype,
    }));

    const emailRecord = await prisma.email.create({
      data: {
        userId,
        recipient: to,
        subject: subject || '',
        body: content || '',
        scheduledAt: new Date(),
        status: 'DRAFT',
        attachments: {
          create: attachmentsData,
        }
      },
    });

    return res.status(200).json({
      message: 'Draft saved successfully!',
      id: emailRecord.id,
    });
  } catch (error: any) {
    console.error('Error in saveDraft:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ────────────── Schedule Emails (bulk, delayed via BullMQ) ──────────────
export const scheduleEmails = async (req: AuthRequest, res: Response) => {
  try {
    const { recipients, subject, body, content, delay, hourlyLimit, startTime, delayBetweenEmails, senderId, tenantId } = req.body;
    const userId = req.userId!;

    // Parse array fields if they came from FormData as a stringified JSON (fallback)
    let parsedRecipients = recipients;
    if (typeof recipients === 'string') {
      try {
        parsedRecipients = JSON.parse(recipients);
      } catch (e) {
        parsedRecipients = [recipients];
      }
    }

    if (!parsedRecipients || !Array.isArray(parsedRecipients) || parsedRecipients.length === 0) {
      return res.status(400).json({ error: 'Valid recipients array is required' });
    }

    // Use HTML content if provided, fall back to body
    const emailBody = content || body || '';

    const files = (req.files as Express.Multer.File[]) || [];
    const attachmentsData = files.map(f => ({
      filename: f.originalname,
      path: f.path,
      size: f.size,
      mimeType: f.mimetype,
    }));

    // Determine the sender identity
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const effectiveSenderId = senderId || user?.email || userId;

    // 1. Create the campaign
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        subject: subject || '',
        body: emailBody,
        startTime: startTime ? new Date(startTime) : new Date(),
        delayBetweenEmails: Number(delayBetweenEmails || delay || 2000),
        hourlyLimit: Number(hourlyLimit || 100),
      },
    });

    // 2. Schedule individual emails with delays
    const baseTime = startTime ? new Date(startTime).getTime() : Date.now();
    const delayMs = Number(delayBetweenEmails || delay || 2000);

    const emailData = parsedRecipients.map((recipient: string, index: number) => {
      const scheduledAt = new Date(baseTime + index * delayMs);
      return {
        campaignId: campaign.id,
        userId,
        recipient,
        subject: subject || '',
        body: emailBody,
        senderId: effectiveSenderId,
        tenantId: tenantId || null,
        scheduledAt,
        status: 'SCHEDULED',
      };
    });

    // 3. Create all email records in DB (can't do createMany with nested relations)
    for (const emailObj of emailData) {
      await prisma.email.create({
        data: {
          ...emailObj,
          attachments: {
            create: attachmentsData,
          }
        }
      });
    }

    // 4. Fetch created emails to get their IDs for BullMQ jobs
    const createdEmails = await prisma.email.findMany({
      where: {
        campaignId: campaign.id,
        userId,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // 5. Enqueue into BullMQ with idempotent job IDs
    const jobData: EmailJobData[] = createdEmails.map((email) => ({
      emailId: email.id,
      to: email.recipient,
      subject: email.subject,
      html: email.body,
      senderId: email.senderId || effectiveSenderId,
      scheduledAt: email.scheduledAt.toISOString(),
      tenantId: email.tenantId || undefined,
    }));

    await enqueueEmailBatch(jobData);

    return res.status(201).json({
      message: `Successfully scheduled ${recipients.length} emails`,
      campaignId: campaign.id,
    });
  } catch (error) {
    console.error('Error scheduling emails:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ────────────── Get All Emails ──────────────
export const getAllEmails = async (req: AuthRequest, res: Response) => {
  try {
    const emails = await prisma.email.findMany({
      where: {
        userId: req.userId,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(emails);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ────────────── Get Scheduled Emails ──────────────
export const getScheduledEmails = async (req: AuthRequest, res: Response) => {
  try {
    const emails = await prisma.email.findMany({
      where: {
        userId: req.userId,
        status: { in: ['PENDING', 'DELAYED'] },
      },
      orderBy: { scheduledAt: 'asc' },
    });
    return res.json(emails);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ────────────── Get Sent Emails ──────────────
export const getSentEmails = async (req: AuthRequest, res: Response) => {
  try {
    const emails = await prisma.email.findMany({
      where: {
        userId: req.userId,
        status: { in: ['SENT', 'FAILED'] },
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
    return res.json(emails);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ────────────── Toggle Star ──────────────
export const toggleStar = async (req: AuthRequest, res: Response) => {
  try {
    const email = await prisma.email.findUnique({ where: { id: req.params.id } });
    if (!email || email.userId !== req.userId) {
      return res.status(404).json({ error: 'Email not found' });
    }
    // @ts-ignore
    const updated = await prisma.email.update({
      where: { id: email.id },
      // @ts-ignore
      data: { isStarred: !email.isStarred },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ────────────── Toggle Archive ──────────────
export const toggleArchive = async (req: AuthRequest, res: Response) => {
  try {
    const email = await prisma.email.findUnique({ where: { id: req.params.id } });
    if (!email || email.userId !== req.userId) {
      return res.status(404).json({ error: 'Email not found' });
    }
    // @ts-ignore
    const updated = await prisma.email.update({
      where: { id: email.id },
      // @ts-ignore
      data: { isArchived: !email.isArchived },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ────────────── Delete Email ──────────────
export const deleteEmail = async (req: AuthRequest, res: Response) => {
  try {
    const email = await prisma.email.findUnique({ where: { id: req.params.id } });
    if (!email || email.userId !== req.userId) {
      return res.status(404).json({ error: 'Email not found' });
    }
    await prisma.attachment.deleteMany({ where: { emailId: email.id } });
    await prisma.email.delete({ where: { id: email.id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
