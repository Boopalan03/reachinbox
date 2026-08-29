import { WebClient } from '@slack/web-api';
import prisma from '../prisma';
import dotenv from 'dotenv';

dotenv.config();

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || '';
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback';

/**
 * Generate the Slack OAuth authorization URL.
 * The `state` parameter carries the userId for mapping after callback.
 */
export function getAuthUrl(userId: string): string {
  const scopes = 'chat:write,chat:write.public,channels:read';
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64url');

  return (
    `https://slack.com/oauth/v2/authorize` +
    `?client_id=${encodeURIComponent(SLACK_CLIENT_ID)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(SLACK_REDIRECT_URI)}` +
    `&state=${encodeURIComponent(state)}`
  );
}

/**
 * Handle the OAuth callback from Slack.
 * Exchanges the authorization code for a bot token and stores it.
 */
export async function handleCallback(code: string, state: string): Promise<void> {
  // Decode state to get userId
  const { userId } = JSON.parse(Buffer.from(state, 'base64url').toString());

  // Exchange code for token
  const client = new WebClient();
  const result = await client.oauth.v2.access({
    client_id: SLACK_CLIENT_ID,
    client_secret: SLACK_CLIENT_SECRET,
    code,
    redirect_uri: SLACK_REDIRECT_URI,
  });

  if (!result.ok || !result.access_token) {
    throw new Error(`Slack OAuth failed: ${result.error || 'unknown error'}`);
  }

  const accessToken = result.access_token;
  const workspaceId = (result as any).team?.id || 'unknown';
  const teamName = (result as any).team?.name || '';

  // Find a default channel to post to
  let channelId = process.env.SLACK_DEFAULT_CHANNEL || 'general';
  try {
    const botClient = new WebClient(accessToken);
    const channelsResult = await botClient.conversations.list({ types: 'public_channel', limit: 100 });
    const generalChannel = channelsResult.channels?.find(
      (ch: any) => ch.name === (process.env.SLACK_DEFAULT_CHANNEL || 'general')
    );
    if (generalChannel?.id) {
      channelId = generalChannel.id;
    }
  } catch {
    // If we can't list channels, we'll use the channel name and let chat.postMessage resolve it
  }

  // Upsert the connection (supports reconnect — overwrites old token)
  await prisma.slackConnection.upsert({
    where: { userId },
    update: {
      accessToken,
      workspaceId,
      teamName,
      channelId,
      updatedAt: new Date(),
    },
    create: {
      userId,
      accessToken,
      workspaceId,
      teamName,
      channelId,
    },
  });

  console.log(`✅ Slack connected for user ${userId} (workspace: ${teamName})`);
}

/**
 * Disconnect Slack — removes the stored token from DB.
 */
export async function disconnect(userId: string): Promise<void> {
  try {
    await prisma.slackConnection.delete({ where: { userId } });
    console.log(`🔌 Slack disconnected for user ${userId}`);
  } catch {
    // If no connection exists, that's fine
  }
}

/**
 * Get connection status for a user.
 */
export async function getStatus(userId: string): Promise<{
  connected: boolean;
  workspaceId?: string;
  teamName?: string;
}> {
  const connection = await prisma.slackConnection.findUnique({ where: { userId } });
  if (connection) {
    return {
      connected: true,
      workspaceId: connection.workspaceId,
      teamName: connection.teamName || undefined,
    };
  }
  return { connected: false };
}

/**
 * Send a rate limit notification to Slack.
 *
 * Gracefully skips if:
 * - Slack is not connected for any user
 * - The message fails to send (no crash)
 */
export async function sendRateLimitNotification(
  senderId: string,
  limit: number,
  userId?: string
): Promise<void> {
  try {
    // Find any active Slack connection — prefer the specified userId, fall back to any connection
    let connection = null;
    let tokenToUse = process.env.SLACK_BOT_TOKEN; // Fallback to static token

    if (userId) {
      connection = await prisma.slackConnection.findUnique({ where: { userId } });
    }
    if (!connection) {
      connection = await prisma.slackConnection.findFirst();
    }

    if (connection?.accessToken) {
      tokenToUse = connection.accessToken;
    }

    if (!tokenToUse) {
      // Slack not connected and no static token — skip silently
      return;
    }

    const client = new WebClient(tokenToUse);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const message = [
      '🚨 *Hourly Email Limit Reached*',
      '',
      `*Sender:* ${senderId}`,
      `*Limit:* ${limit} emails/hour`,
      '',
      'Remaining emails have been automatically rescheduled to the next available hour.',
      '',
      `*Time:* ${timeStr}`,
    ].join('\n');

    await client.chat.postMessage({
      channel: connection?.channelId || process.env.SLACK_DEFAULT_CHANNEL || 'general',
      text: message,
      mrkdwn: true,
    });

    console.log(`📨 Slack notification sent for rate limit on ${senderId}`);
  } catch (error) {
    // Never crash the email pipeline because of a Slack notification failure
    console.error('⚠️ Failed to send Slack notification (non-fatal):', (error as Error).message);
  }
}

/**
 * Check if Slack credentials are configured.
 */
export function isConfigured(): boolean {
  return !!(SLACK_CLIENT_ID && SLACK_CLIENT_SECRET);
}
