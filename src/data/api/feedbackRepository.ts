import type { MealFeedback, MealFeedbackDraft } from '@/domain/schemas/feedback';
import type { FeedbackRepository } from '@/data/repositories/types';
import { request } from './client';

/**
 * Meal feedback over HTTP.
 *
 * No screen calls this yet — rating a meal is Stage 4's work. It exists so the contract has a
 * real implementation on the path the app actually uses, rather than a gap that would be
 * discovered when the UI arrives.
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
