import type { MealRating } from '../schemas/feedback';

export const MEAL_RATING_LABELS: Record<MealRating, string> = {
  loved: 'Loved it',
  liked: 'Liked it',
  ok: 'It was okay',
  disliked: 'Not again',
};

export function describeMealRating(rating: MealRating): string {
  return MEAL_RATING_LABELS[rating];
}
