import api from './api';

export interface SlackStatus {
  connected: boolean;
  workspaceId?: string;
  teamName?: string;
}

export const slackService = {
  /**
   * Get the current Slack connection status.
   */
  getStatus: async (): Promise<SlackStatus> => {
    const response = await api.get('/slack/status');
    return response.data;
  },

  /**
   * Initiate Slack OAuth flow.
   * This redirects the browser to Slack's authorization page.
   */
  connect: (): void => {
    const token = localStorage.getItem('token');
    // We redirect to the backend endpoint which requires auth
    // The token is passed as a query param since this is a redirect, not an API call
    window.location.href = `${api.defaults.baseURL}/slack/connect?token=${token}`;
  },

  /**
   * Disconnect Slack integration.
   */
  disconnect: async (): Promise<void> => {
    await api.delete('/slack/disconnect');
  },
};
