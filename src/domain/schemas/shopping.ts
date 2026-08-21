import { z } from 'zod';
import {
  categorySchema,
  idSchema,
  nameSchema,
  noteSchema,
  priceSchema,
  quantitySchema,
  unitSchema,
} from './common';

export const shoppingItemSchema = z.object({
  id: idSchema,
  name: nameSchema,
  category: categorySchema,
  quantity: quantitySchema.min(1, 'At least one'),
  unit: unitSchema,
  price: priceSchema,
  priority: z.boolean(),
  note: noteSchema,
  checked: z.boolean(),
});

export type ShoppingItem = z.infer<typeof shoppingItemSchema>;

/** Shape accepted by the add/edit form. `checked` is owned by the repository. */
export const shoppingItemDraftSchema = shoppingItemSchema.omit({ id: true, checked: true });
export type ShoppingItemDraft = z.infer<typeof shoppingItemDraftSchema>;

export const shoppingItemPatchSchema = shoppingItemDraftSchema.partial();
export type ShoppingItemPatch = z.infer<typeof shoppingItemPatchSchema>;
