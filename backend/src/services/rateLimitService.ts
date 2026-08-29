import dotenv from 'dotenv';
import prisma from '../prisma';

dotenv.config();

/**
 * Get the current UTC hour window start time.
 */
function getCurrentHourStart(date?: Date): Date {
  const d = date || new Date();
  const start = new Date(d);
  start.setUTCMinutes(0, 0, 0);
  return start;
}

/**
 * Calculate the start of the next UTC hour.
 */
function getNextHourStart(date?: Date): Date {
  const d = date || new Date();
  const next = new Date(d);
  next.setUTCHours(next.getUTCHours() + 1, 0, 0, 0);
  return next;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  nextWindowStart: Date;
}

/**
 * Get the applicable limit based on mode.
 */
function getLimit(): number {
  const mode = process.env.RATE_LIMIT_MODE || 'global';
  if (mode === 'sender') {
    return Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || 50);
  }
  return Number(process.env.MAX_EMAILS_PER_HOUR || 200);
}

/**
 * Check and increment the counter by directly counting SENT emails in the DB
 * for the current hour window. This ensures persistent rate limits even if the server restarts.
 */
export async function checkAndIncrement(senderId?: string): Promise<RateLimitResult> {
  const mode = process.env.RATE_LIMIT_MODE || 'global';
  const limit = getLimit();
  const currentHourStart = getCurrentHourStart();

  const whereClause: any = {
    status: 'SENT',
    sentAt: { gte: currentHourStart }
  };

  if (mode === 'sender' && senderId) {
    whereClause.senderId = senderId;
  }

  // Count how many have been successfully sent this hour
  const currentCount = await prisma.email.count({
    where: whereClause
  });

  if (currentCount >= limit) {
    return {
      allowed: false,
      currentCount,
      limit,
      nextWindowStart: getNextHourStart(),
    };
  }

  return {
    allowed: true,
    currentCount: currentCount + 1, // We simulate increment because it will be marked SENT later
    limit,
    nextWindowStart: getNextHourStart(),
  };
}

/**
 * Get the delay in milliseconds until the next available hour window.
 */
export function getDelayUntilNextWindow(): number {
  const now = Date.now();
  const next = getNextHourStart().getTime();
  return Math.max(0, next - now);
}

export { getNextHourStart };
