import type { PantryItem, PantryItemDraft, PantryItemPatch } from '@/domain/schemas/pantry';
import type { PantryRepository } from '@/data/repositories/types';
import { patch, request } from './client';

/**
 * The pantry over HTTP (ADR-003), the same contract the localStorage and Drizzle
 * implementations satisfy.
 */

const BASE = '/api/pantry';

export const apiPantryRepository: PantryRepository = {
  async list() {
    const { items } = await request<{ items: PantryItem[] }>(BASE);
    return items;
  },

  async create(draft: PantryItemDraft) {
    const { item } = await request<{ item: PantryItem }>(BASE, {
      method: 'POST',
      body: JSON.stringify(draft),
    });
    return item;
  },

  async update(id: string, itemPatch: PantryItemPatch) {
    return patch<PantryItem>(`${BASE}/${id}`, itemPatch);
  },

  /** Relative, so the server floors at zero and two steppers cannot race each other. */
  async adjustQuantity(id: string, delta: number) {
    return patch<PantryItem>(`${BASE}/${id}`, { adjust: delta });
  },

  async remove(id: string) {
    await request<void>(`${BASE}/${id}`, { method: 'DELETE' });
  },
};
