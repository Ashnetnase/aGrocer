import type { OrderLineItem, OrderLineItemDraft } from '@/domain/schemas/orderHistory';
import type { OrderHistoryRepository } from '@/data/repositories/types';
import { request } from './client';

/**
 * Imported order history over HTTP. Read on demand — Settings calls this when its order-history
 * panel opens, not as part of the application's initial load.
 */
export const apiOrderHistoryRepository: OrderHistoryRepository = {
  async list() {
    const { lines } = await request<{ lines: OrderLineItem[] }>('/api/orders');
    return lines;
  },

  async importLines(drafts: OrderLineItemDraft[]) {
    const { lines } = await request<{ lines: OrderLineItem[] }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ lines: drafts }),
    });
    return lines;
  },

  async matchToCatalogue() {
    return request<{ matched: number; total: number }>('/api/orders/match', { method: 'POST' });
  },
};
