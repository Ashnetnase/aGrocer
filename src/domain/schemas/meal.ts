import { z } from 'zod';
import { dayKeySchema, idSchema, nameSchema, slotSchema } from './common';

export const mealTagSchema = z.enum(['Quick', 'Kids', 'Budget', 'Favourite', 'Weekend']);
export type MealTag = z.infer<typeof mealTagSchema>;

export const MEAL_TAGS = mealTagSchema.options;

export const mealSchema = z.object({
  id: idSchema,
  name: nameSchema,
  minutes: z
    .number({ invalid_type_error: 'Enter a number' })
    .int('Whole minutes only')
    .min(1, 'At least a minute')
    .max(600, 'Too long'),
  serves: z
    .number({ invalid_type_error: 'Enter a number' })
    .int('Whole people only')
    .min(1, 'At least one')
    .max(20, 'Too many'),
  tags: z.array(mealTagSchema),
  /**
   * Optional: Stage 1 has no image upload, so meals the family adds themselves
   * have no photo and render a placeholder instead of a misleading stock image.
   */
  image: z.string().min(1).optional(),
  description: z.string().trim().max(300),
  ingredients: z.array(z.string().trim().min(1, 'Required')).max(30, 'Too many ingredients'),
});

export type Meal = z.infer<typeof mealSchema>;

export const mealDraftSchema = mealSchema.omit({ id: true });
export type MealDraft = z.infer<typeof mealDraftSchema>;

/** Meals assigned to slots, keyed by day. A missing slot means "not planned". */
export const planSchema = z.record(dayKeySchema, z.record(slotSchema, idSchema).optional());
export type Plan = z.infer<typeof planSchema>;

export const planEntrySchema = z.object({
  day: dayKeySchema,
  slot: slotSchema,
  mealId: idSchema,
});
export type PlanEntry = z.infer<typeof planEntrySchema>;
