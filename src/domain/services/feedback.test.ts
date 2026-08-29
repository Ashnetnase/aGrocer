import { describe, expect, it } from 'vitest';
import { MEAL_RATINGS, mealFeedbackDraftSchema } from '../schemas/feedback';
import { describeMealRating } from './feedback';

describe('describeMealRating', () => {
  it('gives every persisted rating a family-facing label', () => {
    expect(MEAL_RATINGS.map(describeMealRating)).toEqual([
      'Loved it',
      'Liked it',
      'It was okay',
      'Not again',
    ]);
  });
});

describe('mealFeedbackDraftSchema', () => {
  it('accepts family-level feedback without a member or note', () => {
    expect(mealFeedbackDraftSchema.safeParse({
      mealId: 'm1',
      rating: 'liked',
      ateOn: '2026-08-29',
    }).success).toBe(true);
  });

  it('refuses malformed meal dates at the UI/API boundary', () => {
    expect(mealFeedbackDraftSchema.safeParse({
      mealId: 'm1',
      rating: 'liked',
      ateOn: '29/08/2026',
    }).success).toBe(false);
  });
});
