import type { SchoolNotification, SchoolNotificationDraft } from '@/domain/schemas/school';
import type { SchoolRepository } from '@/data/repositories/types';
import { patch, request } from './client';

const BASE = '/api/school';

/** Kids/School notifications over HTTP (Phase 12). Read on demand by the Kids screen. */
export const apiSchoolRepository: SchoolRepository = {
  async list() {
    const { notifications } = await request<{ notifications: SchoolNotification[] }>(BASE);
    return notifications;
  },

  async add(draft: SchoolNotificationDraft) {
    const { notification } = await request<{ notification: SchoolNotification }>(BASE, {
      method: 'POST',
      body: JSON.stringify(draft),
    });
    return notification;
  },

  async markRead(id: string, read: boolean) {
    return patch<SchoolNotification>(`${BASE}/${id}`, { read }, 'notification');
  },

  async dismiss(id: string) {
    return patch<SchoolNotification>(`${BASE}/${id}`, { dismissed: true }, 'notification');
  },
};
