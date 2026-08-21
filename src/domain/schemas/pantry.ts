import { z } from 'zod';
import {
  categorySchema,
  idSchema,
  nameSchema,
  noteSchema,
  quantitySchema,
  stockStateSchema,
  unitSchema,
} from './common';

export const pantryItemSchema = z.object({
  id: idSchema,
  name: nameSchema,
  category: categorySchema,
  quantity: quantitySchema,
  unit: unitSchema,
  state: stockStateSchema,
  note: noteSchema,
});

export type PantryItem = z.infer<typeof pantryItemSchema>;

/** Shape accepted by the add/edit form and by `PantryRepository.create`. */
export const pantryItemDraftSchema = pantryItemSchema.omit({ id: true });
export type PantryItemDraft = z.infer<typeof pantryItemDraftSchema>;

export const pantryItemPatchSchema = pantryItemDraftSchema.partial();
export type PantryItemPatch = z.infer<typeof pantryItemPatchSchema>;
