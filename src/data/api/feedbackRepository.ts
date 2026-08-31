import type { MealFeedback, MealFeedbackDraft } from '@/domain/schemas/feedback';
import type { FeedbackRepository } from '@/data/repositories/types';
import { request } from './client';

/**
 * Meal feedback over HTTP.
 *
 * Meal detail calls this on demand, so feedback does not add work to the application's initial
 * household-data load.
 */
export const apiFeedbackRepository: FeedbackRepository = {
  async list(mealId?: string) {
    const query = mealId ? `?mealId=${encodeURIComponent(mealId)}` : '';
    const { feedback } = await request<{ feedback: MealFeedback[] }>(`/api/feedback${query}`);
    return feedback;
  },

  async add(draft: MealFeedbackDraft) {
    const { feedback } = await request<{ feedback: MealFeedback }>('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
    return feedback;
  },
};
