import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as slackService from '../services/slackService';

/**
 * GET /api/slack/connect
 * Redirects the user to Slack's OAuth authorization page.
 */
export const connect = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    if (!slackService.isConfigured()) {
      return res.status(503).json({
        error: 'Slack integration is not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in .env',
      });
    }

    const authUrl = slackService.getAuthUrl(userId);
    return res.redirect(authUrl);
  } catch (error: any) {
    console.error('Slack connect error:', error);
    return res.status(500).json({ error: 'Failed to initiate Slack connection' });
  }
};

/**
 * GET /api/slack/callback
 * Handles the OAuth callback from Slack after user authorization.
 */
export const callback = async (req: Request, res: Response) => {
  try {
    const { code, state, error: slackError } = req.query;

    if (slackError) {
      // User denied the authorization
      return res.redirect('http://localhost:5173/dashboard?slack=denied');
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    await slackService.handleCallback(code as string, state as string);

    // Redirect back to the dashboard with success indicator
    return res.redirect('http://localhost:5173/dashboard?slack=connected');
  } catch (error: any) {
    console.error('Slack callback error:', error);
    return res.redirect('http://localhost:5173/dashboard?slack=error');
  }
};

/**
 * DELETE /api/slack/disconnect
 * Removes the stored Slack token for the current user.
 */
export const disconnect = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    await slackService.disconnect(userId);
    return res.json({ message: 'Slack disconnected successfully' });
  } catch (error: any) {
    console.error('Slack disconnect error:', error);
    return res.status(500).json({ error: 'Failed to disconnect Slack' });
  }
};

/**
 * GET /api/slack/status
 * Returns the Slack connection status for the current user.
 */
export const status = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const result = await slackService.getStatus(userId);
    return res.json(result);
  } catch (error: any) {
    console.error('Slack status error:', error);
    return res.status(500).json({ error: 'Failed to get Slack status' });
  }
};
