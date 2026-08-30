import { z } from 'zod';
import { retailerProductSchema, trolleyAddItemSchema, trolleyAddResultSchema, type TrolleyAddItem } from './schemas';

export const AGROCER_EXTENSION_SOURCE = 'agrocer-new-world-extension';
export const AGROCER_WEB_SOURCE = 'agrocer-web';

export const extensionEventSchema = z.discriminatedUnion('type', [
  z.object({ source: z.literal(AGROCER_EXTENSION_SOURCE), type: z.literal('AGROCER_NEW_WORLD_READY') }),
  z.object({ source: z.literal(AGROCER_EXTENSION_SOURCE), type: z.literal('AGROCER_NEW_WORLD_ACCEPTED'), count: z.number().int().nonnegative() }),
  z.object({ source: z.literal(AGROCER_EXTENSION_SOURCE), type: z.literal('AGROCER_NEW_WORLD_RESULTS'), results: z.array(trolleyAddResultSchema) }),
  z.object({
    source: z.literal(AGROCER_EXTENSION_SOURCE), type: z.literal('AGROCER_NEW_WORLD_SEARCH_RESULTS'),
    shoppingItemId: z.string(), status: z.enum(['ok', 'blocked', 'selector-failed']),
    products: z.array(retailerProductSchema), message: z.string().optional(),
  }),
  z.object({ source: z.literal(AGROCER_EXTENSION_SOURCE), type: z.literal('AGROCER_NEW_WORLD_ERROR'), message: z.string() }),
]);

export function pingNewWorldExtension(): void {
  window.postMessage({ source: AGROCER_WEB_SOURCE, type: 'AGROCER_NEW_WORLD_PING' }, window.location.origin);
}

export function sendBatchToNewWorldExtension(items: TrolleyAddItem[]): void {
  const validated = z.array(trolleyAddItemSchema).min(1).max(100).parse(items);
  window.postMessage({ source: AGROCER_WEB_SOURCE, type: 'AGROCER_NEW_WORLD_BATCH', items: validated }, window.location.origin);
}

export function searchWithNewWorldExtension(shoppingItemId: string, query: string): void {
  window.postMessage({ source: AGROCER_WEB_SOURCE, type: 'AGROCER_NEW_WORLD_SEARCH', shoppingItemId, query }, window.location.origin);
}
