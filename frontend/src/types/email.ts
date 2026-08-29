export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'DELAYED' | 'SENT' | 'FAILED' | 'DRAFT';

export interface Email {
  id: string;
  recipient: string;
  subject: string;
  body?: string;
  senderId?: string;
  tenantId?: string;
  scheduledAt?: string;
  isStarred: boolean;
  isArchived: boolean;
  sentAt?: string | null;
  delayedUntil?: string | null;
  statusReason?: string | null;
  errorMessage?: string | null;
  attempts?: number;
  processingStartedAt?: string | null;
  createdAt: string;
  status: EmailStatus;
  attachments?: {
    filename: string;
    path: string;
    size: number;
    mimeType: string;
  }[];
}

export interface ScheduleEmailRequest {
  senderId?: string;
  tenantId?: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
}
