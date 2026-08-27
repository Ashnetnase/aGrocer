import type {
  ShoppingItem,
  ShoppingItemDraft,
  ShoppingItemPatch,
} from '@/domain/schemas/shopping';
import type { ShoppingRepository } from '@/data/repositories/types';

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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  });

  if (!response.ok) {
    // The handlers deliberately return a generic message; the detail is in the server log.
    const detail = await response.json().catch(() => null);
    throw new Error(
      `${init?.method ?? 'GET'} ${url} failed (${response.status})` +
        (detail && typeof detail.error === 'string' ? `: ${detail.error}` : ''),
    );
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

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

  async update(id: string, patch: ShoppingItemPatch) {
    return updateOrToggle(id, patch);
  },

  async toggle(id: string) {
    return updateOrToggle(id, { toggle: true });
  },

  async remove(id: string) {
    await request<void>(`${BASE}/${id}`, { method: 'DELETE' });
  },

  async clearChecked() {
    await request<void>(`${BASE}/checked`, { method: 'DELETE' });
  },
};

/** A missing id is `undefined` in the contract, not an exception. */
async function updateOrToggle(
  id: string,
  body: ShoppingItemPatch | { toggle: true },
): Promise<ShoppingItem | undefined> {
  const response = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`PATCH ${BASE}/${id} failed (${response.status})`);

  const { item } = (await response.json()) as { item: ShoppingItem };
  return item;
}
