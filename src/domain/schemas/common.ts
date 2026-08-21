import { z } from 'zod';

export const categorySchema = z.enum([
  'Fruit & Vegetables',
  'Meat & Seafood',
  'Dairy',
  'Bakery',
  'Pantry',
  'Frozen',
  'Drinks',
  'Snacks',
  'Household',
]);

export type Category = z.infer<typeof categorySchema>;

export const CATEGORIES = categorySchema.options;

export const stockStateSchema = z.enum(['good', 'low', 'out', 'soon']);
export type StockState = z.infer<typeof stockStateSchema>;

export const dayKeySchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
export type DayKey = z.infer<typeof dayKeySchema>;

export const DAY_KEYS = dayKeySchema.options;

export const slotSchema = z.enum(['breakfast', 'lunch', 'dinner']);
export type Slot = z.infer<typeof slotSchema>;

export const SLOTS = slotSchema.options;

/** Entity id. Repositories own generation so the backend can supply real ids later. */
export const idSchema = z.string().min(1);

/** A non-empty, trimmed display name. */
export const nameSchema = z.string().trim().min(1, 'Required').max(80, 'Too long');

/** Money is a plain number of NZD. Stage 2 may move to integer cents. */
export const priceSchema = z
  .number({ invalid_type_error: 'Enter a number' })
  .min(0, 'Cannot be negative')
  .max(9999, 'Too large');

export const quantitySchema = z
  .number({ invalid_type_error: 'Enter a number' })
  .int('Whole numbers only')
  .min(0, 'Cannot be negative')
  .max(999, 'Too many');

export const unitSchema = z.string().trim().min(1, 'Required').max(24, 'Too long');

export const noteSchema = z.string().trim().max(140, 'Too long').optional();
