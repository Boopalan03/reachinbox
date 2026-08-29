/**
 * Queue service — manages email job scheduling via the database.
 *
 * Instead of BullMQ/Redis, emails are tracked purely through their DB status.
 * The background worker polls for QUEUED/DELAYED emails and processes them.
 */

export interface EmailJobData {
  emailId: string;
  to: string;
  subject: string;
  html: string;
  senderId: string;
  scheduledAt: string;
  tenantId?: string;
}

/**
 * "Enqueue" an email — in this architecture the email is already in the DB
 * with status QUEUED. This function is a no-op placeholder that maintains
 * the same interface for the controller.
 *
 * The background worker in emailWorker.ts polls the DB for QUEUED emails.
 */
export async function enqueueEmail(data: EmailJobData): Promise<void> {
  // No-op: the DB record is the queue. The worker polls for QUEUED emails.
}

/**
 * "Enqueue" a batch — same as above, batch version.
 */
export async function enqueueEmailBatch(jobs: EmailJobData[]): Promise<void> {
  // No-op: the DB records are the queue.
}
