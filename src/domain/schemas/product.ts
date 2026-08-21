import { z } from 'zod';
import {
  categorySchema,
  idSchema,
  nameSchema,
  priceSchema,
  quantitySchema,
  unitSchema,
} from './common';

export const productSchema = z.object({
  id: idSchema,
  name: nameSchema,
  brand: z.string().trim().max(60),
  size: z.string().trim().max(40),
  category: categorySchema,
  price: priceSchema,
  defaultQuantity: quantitySchema.min(1, 'At least one'),
  unit: unitSchema,
  favourite: z.boolean(),
  timesBought: z.number().int().min(0),
});

export type Product = z.infer<typeof productSchema>;

export const productDraftSchema = productSchema.omit({ id: true, timesBought: true });
export type ProductDraft = z.infer<typeof productDraftSchema>;

export const productPatchSchema = productDraftSchema.partial();
export type ProductPatch = z.infer<typeof productPatchSchema>;
