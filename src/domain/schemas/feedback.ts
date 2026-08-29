import { z } from 'zod';
import { idSchema } from './common';

/**
 * What the family thought of a meal (Stage 2 data model).
 *
 * There is no screen for this yet — rating a meal is Stage 4's consumption-learning work.
 * The shape is settled now because Stage 2 is where the data model is settled, and history
 * cannot be retrofitted: you cannot record last month's dinners after the fact.
 */

/**
 * Four coarse steps rather than five stars.
 *
 * A numeric scale invites precision nobody has about a Tuesday dinner, and makes the
 * difference between a 3 and a 4 something to argue about. These map cleanly onto the
 * question actually being answered: would we have this again?
 */
export const mealRatingSchema = z.enum(['loved', 'liked', 'ok', 'disliked']);
export type MealRating = z.infer<typeof mealRatingSchema>;

export const MEAL_RATINGS = mealRatingSchema.options;

export const mealFeedbackSchema = z.object({
  id: idSchema,
  mealId: idSchema,
  /** Who rated it, where anybody said. Optional: "the family liked it" is a useful record. */
  memberId: idSchema.optional(),
  rating: mealRatingSchema,
  note: z.string().trim().max(280).optional(),
  /** ISO `yyyy-mm-dd`. When it was eaten, not when it was rated — those differ. */
  ateOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected yyyy-mm-dd'),
  createdAt: z.string(),
});

export type MealFeedback = z.infer<typeof mealFeedbackSchema>;

export const mealFeedbackDraftSchema = mealFeedbackSchema.omit({ id: true, createdAt: true });
export type MealFeedbackDraft = z.infer<typeof mealFeedbackDraftSchema>;
