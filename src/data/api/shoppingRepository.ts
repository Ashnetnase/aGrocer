import type {
  ShoppingItem,
  ShoppingItemDraft,
  ShoppingItemPatch,
} from '@/domain/schemas/shopping';
import type { ShoppingRepository } from '@/data/repositories/types';
import { patch, request } from './client';

/**
 * The shopping list over HTTP (ADR-003).
 *
 * Satisfies the same contract as the localStorage and Drizzle implementations, so the
 * provider and every shopping component are unchanged — this is the seam earning its keep.
 *
 * The server is authoritative: each write returns the row Postgres produced rather than a
 * value guessed here, which is what keeps the quantity merge honest.
 */

const BASE = '/api/shopping';

export const apiShoppingRepository: ShoppingRepository = {
  async list() {
    const { items } = await request<{ items: ShoppingItem[] }>(BASE);
    return items;
  },

  async add(draft: ShoppingItemDraft) {
    const { items } = await request<{ items: ShoppingItem[] }>(BASE, {
      method: 'POST',
      body: JSON.stringify(draft),
    });
    const [item] = items;
    if (!item) throw new Error('POST /api/shopping returned no item');
    return item;
  },

  async addMany(drafts: ShoppingItemDraft[]) {
    if (drafts.length === 0) return [];
    const { items } = await request<{ items: ShoppingItem[] }>(BASE, {
      method: 'POST',
      body: JSON.stringify({ items: drafts }),
    });
    return items;
  },

  async update(id: string, itemPatch: ShoppingItemPatch) {
    return patch<ShoppingItem>(`${BASE}/${id}`, itemPatch);
  },

  async toggle(id: string) {
    return patch<ShoppingItem>(`${BASE}/${id}`, { toggle: true });
  },

  async remove(id: string) {
    await request<void>(`${BASE}/${id}`, { method: 'DELETE' });
  },

  async clearChecked() {
    await request<void>(`${BASE}/checked`, { method: 'DELETE' });
  },
};
