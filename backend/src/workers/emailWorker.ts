import prisma from '../prisma';
import { sendEmail } from '../services/mailer';
import { checkAndIncrement, getDelayUntilNextWindow, getNextHourStart } from '../services/rateLimitService';
import { sendRateLimitNotification } from '../services/slackService';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

let isProcessing = false;
let sentCountThisRun = 0;
let workerIntervalId: NodeJS.Timeout | null = null;
const WORKER_ID = uuidv4();
const POLL_INTERVAL_MS = 2000;
const TEST_STOP_AFTER = process.env.TEST_STOP_AFTER ? Number(process.env.TEST_STOP_AFTER) : null;

/**
 * Run at server boot: Instantly recover any emails that were interrupted.
 * They are pushed back to SCHEDULED.
 */
export async function recoverInterruptedJobs(): Promise<void> {
  console.log('[Recovery] Checking interrupted jobs...');
  
  // Find all PROCESSING jobs regardless of time (since the server just booted)
  const interruptedJobs = await prisma.email.findMany({
    where: { status: 'PROCESSING' }
  });

  if (interruptedJobs.length > 0) {
    for (const job of interruptedJobs) {
      console.log(`[Recovery] Found Email ${job.id} in PROCESSING`);
      console.log(`[Recovery] Recovering Email ${job.id}`);
      
      await prisma.email.update({
        where: { id: job.id },
        data: {
          status: 'SCHEDULED',
          processingStartedAt: null,
          processingWorkerId: null,
          leaseExpiresAt: null
        }
      });
      console.log(`[Recovery] Email ${job.id} ready for retry`);
    }
  } else {
    console.log('[Recovery] No interrupted jobs found.');
  }
}

/**
 * Checks for jobs that have been PROCESSING longer than their lease (5 mins).
 * This runs periodically while the server is active in case a different worker crashed.
 */
async function recoverStaleLeases(): Promise<void> {
  const now = new Date();
  
  const staleJobs = await prisma.email.findMany({
    where: {
      status: 'PROCESSING',
      leaseExpiresAt: { lt: now }
    }
  });

  for (const job of staleJobs) {
    console.log(`[Recovery] Found stale job: ${job.id}`);
    console.log(`[Recovery] Recovering job: ${job.id}`);
    
    await prisma.email.update({
      where: { id: job.id },
      data: {
        status: 'SCHEDULED',
        processingStartedAt: null,
        processingWorkerId: null,
        leaseExpiresAt: null
      }
    });
  }
}

/**
 * Start the strict sequential background email worker.
 */
export function startEmailScheduler(): NodeJS.Timeout | null {
  console.log('[Scheduler] Started');
  if (TEST_STOP_AFTER) {
    console.log(`[Scheduler] 🧪 TEST_STOP_AFTER mode enabled. Will pause after ${TEST_STOP_AFTER} sends.`);
  }
  
  workerIntervalId = setInterval(() => {
    recoverStaleLeases().catch(console.error);
    processNextJob().catch(console.error);
  }, POLL_INTERVAL_MS);
  
  return workerIntervalId;
}

/**
 * Process exactly one job sequentially with atomic claiming.
 */
async function processNextJob(): Promise<void> {
  // Strict locking to prevent overlapping processing in this specific process
  if (isProcessing) return;
  isProcessing = true;

  try {
    const now = new Date();

    // 1. Find the absolute earliest job
    const nextJobRef = await prisma.email.findFirst({
      where: {
        OR: [
          { status: 'SCHEDULED', scheduledAt: { lte: now } },
          { status: 'DELAYED', delayedUntil: { lte: now } },
        ]
      },
      orderBy: [
        // Ensure older scheduled dates (which includes recovered jobs) are grabbed absolutely first
        { scheduledAt: 'asc' },
        { id: 'asc' }
      ]
    });

    if (!nextJobRef) {
      isProcessing = false;
      return;
    }

    // 2. Atomically claim it
    const leaseTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minute lease
    
    const updateResult = await prisma.email.updateMany({
      where: {
        id: nextJobRef.id,
        status: nextJobRef.status // Ensures it hasn't changed
      },
      data: { 
        status: 'PROCESSING',
        processingStartedAt: now,
        processingWorkerId: WORKER_ID,
        leaseExpiresAt: leaseTime,
        attempts: { increment: 1 }
      }
    });

    if (updateResult.count === 0) {
      // Another worker claimed it first
      isProcessing = false;
      return;
    }

    // 3. Fetch the fully claimed job
    const job = await prisma.email.findUnique({ where: { id: nextJobRef.id }, include: { attachments: true } });
    if (!job) {
      isProcessing = false;
      return;
    }

    // Identify if this was a resumed job
    if (job.attempts > 1) {
      console.log(`[Scheduler] Resuming from Email ${job.id}`);
    }
    console.log(`[Scheduler] Processing Email ${job.id}`);

    // 4. Rate limiting logic
    const rateLimitResult = await checkAndIncrement(job.senderId || undefined);
    if (!rateLimitResult.allowed) {
      const delayMs = getDelayUntilNextWindow();
      const delayedUntil = new Date(Date.now() + delayMs);

      console.log(`⏳ Rate limit hit. Delaying email ${job.id} until ${delayedUntil.toISOString()}`);
      
      await prisma.email.update({
        where: { id: job.id },
        data: {
          status: 'DELAYED',
          delayedUntil,
          statusReason: 'Hourly rate limit exceeded',
          processingWorkerId: null,
          leaseExpiresAt: null
        }
      });
      sendRateLimitNotification(job.senderId || job.userId, rateLimitResult.limit, job.userId).catch(() => {});
      
      isProcessing = false;
      return;
    }

    // 5. Actually send the email, fully awaited.
    try {
      console.log(`[Email] Sending to ${job.recipient}`);
      const attachments = job.attachments.map(att => ({ filename: att.filename, path: att.path }));
      const result = await sendEmail(job.recipient, job.subject, job.body, attachments);
      
      console.log(`[Email] Email ${job.id} successfully accepted`);

      // 6. Only after confirmation do we mark SENT
      await prisma.email.update({
        where: { id: job.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId: result.messageId,
          previewUrl: result.previewUrl ? String(result.previewUrl) : null,
          delayedUntil: null,
          statusReason: null,
          processingWorkerId: null,
          leaseExpiresAt: null
        }
      });
      console.log(`[Database] Email ${job.id} marked SENT`);
      
      // Testing hook
      if (TEST_STOP_AFTER) {
        sentCountThisRun++;
        if (sentCountThisRun >= TEST_STOP_AFTER) {
          console.log(`\n[Scheduler] ⏸️ TEST_STOP_AFTER (${TEST_STOP_AFTER}) limit reached. Pausing scheduler.`);
          if (workerIntervalId) clearInterval(workerIntervalId);
        }
      }

    } catch (error: any) {
      console.error(`❌ Failed to send email ${job.id}:`, error.message);
      
      // Real failure (not a crash)
      await prisma.email.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          processingWorkerId: null,
          leaseExpiresAt: null
        }
      });
    }

  } catch (error) {
    console.error('Error in email worker:', error);
  } finally {
    isProcessing = false;
  }
}
