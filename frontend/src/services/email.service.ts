import api from './api';
import type { Email, ScheduleEmailRequest } from '../types/email';

export const emailService = {
  getAllEmails: async (): Promise<Email[]> => {
    const response = await api.get('/emails');
    return response.data;
  },

  getScheduledEmails: async (): Promise<Email[]> => {
    const response = await api.get('/emails/scheduled');
    return response.data;
  },

  getSentEmails: async (): Promise<Email[]> => {
    const response = await api.get('/emails/sent');
    return response.data;
  },

  scheduleEmails: async (data: ScheduleEmailRequest & { attachments?: File[] }) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'attachments' && value !== undefined) {
        if (key === 'recipients') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });
    data.attachments?.forEach(file => formData.append('attachments', file));

    const response = await api.post('/emails/schedule', formData);
    return response.data;
  },

  sendNow: async (data: { to: string; subject: string; content: string; attachments?: File[] }) => {
    const formData = new FormData();
    formData.append('to', data.to);
    formData.append('subject', data.subject);
    formData.append('content', data.content);
    data.attachments?.forEach(file => formData.append('attachments', file));

    const response = await api.post('/emails/send', formData);
    return response.data;
  },

  saveDraft: async (data: { to: string; subject: string; content: string; attachments?: File[] }) => {
    const formData = new FormData();
    formData.append('to', data.to);
    formData.append('subject', data.subject);
    formData.append('content', data.content);
    data.attachments?.forEach(file => formData.append('attachments', file));

    const response = await api.post('/emails/draft', formData);
    return response.data;
  },
  
  toggleStar: async (id: string): Promise<Email> => {
    const response = await api.put(`/emails/${id}/star`);
    return response.data;
  },

  toggleArchive: async (id: string): Promise<Email> => {
    const response = await api.put(`/emails/${id}/archive`);
    return response.data;
  },

  deleteEmail: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.delete(`/emails/${id}`);
    return response.data;
  },

  searchEmails: async (query: string): Promise<Email[]> => {
    const response = await api.get(`/emails/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }
};
