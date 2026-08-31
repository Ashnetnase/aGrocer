import { z } from 'zod';
import { idSchema } from './common';

/**
 * Past retailer orders (Stage 5), imported by pasting a New World order confirmation/invoice.
 *
 * **Deliberately narrow.** Only what a "common order" and a reorder signal need: what was
 * bought, how much, and when. A pasted invoice also carries the household's name, address and
 * phone number — none of that is part of this schema, and the importer that produces these
 * drafts (`src/domain/services/orderImport.ts`) never reads it out. This is the same "paste
 * rather than fetch, review before saving" shape as recipe import (`recipeImport.ts`).
 *
 * History, not state: there is no update, matching `FeedbackRepository`. A line imported wrong
 * is deleted and re-imported, not edited in place.
 */

export const ORDER_RETAILERS = ['new-world'] as const;
export const orderRetailerSchema = z.enum(ORDER_RETAILERS);
export type OrderRetailer = z.infer<typeof orderRetailerSchema>;

export const orderLineItemSchema = z.object({
  id: idSchema,
  retailer: orderRetailerSchema,
  name: z.string().trim().min(1).max(200),
  quantity: z.number().positive().max(1000),
  unit: z.string().trim().min(1).max(24),
  unitPrice: z.number().nonnegative().max(10_000).optional(),
  totalPrice: z.number().nonnegative().max(10_000),
  /** ISO `yyyy-mm-dd`. One date per imported order, applied to every line in the batch. */
  orderedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected yyyy-mm-dd'),
  /** Best-effort link to the household's New World catalogue cache. Never required. */
  matchedProductId: idSchema.optional(),
  matchedProductName: z.string().trim().max(200).optional(),
});
export type OrderLineItem = z.infer<typeof orderLineItemSchema>;

export const orderLineItemDraftSchema = orderLineItemSchema.omit({ id: true });
export type OrderLineItemDraft = z.infer<typeof orderLineItemDraftSchema>;
