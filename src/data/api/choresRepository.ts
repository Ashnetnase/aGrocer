import type { Chore, ChoreDraft, ChorePatch } from '@/domain/schemas/chores';
import type { ChoresRepository } from '@/data/repositories/types';
import { patch, request } from './client';

const BASE = '/api/chores';

/** Household chores over HTTP (Phase 12). */
export const apiChoresRepository: ChoresRepository = {
  async list() {
    const { chores: items } = await request<{ chores: Chore[] }>(BASE);
    return items;
  },

  async create(draft: ChoreDraft) {
    const { chore } = await request<{ chore: Chore }>(BASE, {
      method: 'POST',
      body: JSON.stringify(draft),
    });
    return chore;
  },

  async update(id: string, chorePatch: ChorePatch) {
    return patch<Chore>(`${BASE}/${id}`, chorePatch, 'chore');
  },

  async toggle(id: string) {
    return patch<Chore>(`${BASE}/${id}`, { toggle: true }, 'chore');
  },

  async remove(id: string) {
    await request<void>(`${BASE}/${id}`, { method: 'DELETE' });
  },

  async clearCompleted() {
    await request<void>(`${BASE}/completed`, { method: 'DELETE' });
  },
};
