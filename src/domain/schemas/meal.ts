import { z } from 'zod';
import { dayKeySchema, idSchema, nameSchema, slotSchema } from './common';

export const mealTagSchema = z.enum(['Quick', 'Kids', 'Budget', 'Favourite', 'Weekend']);
export type MealTag = z.infer<typeof mealTagSchema>;

export const MEAL_TAGS = mealTagSchema.options;

export const mealSchema = z.object({
  id: idSchema,
  name: nameSchema,
  minutes: z.number().int().min(1).max(600),
  serves: z.number().int().min(1).max(20),
  tags: z.array(mealTagSchema),
  image: z.string().min(1),
  description: z.string().trim().max(300),
  ingredients: z.array(z.string().trim().min(1)),
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
