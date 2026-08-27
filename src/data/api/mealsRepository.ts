import type { DayKey, Slot } from '@/domain/schemas/common';
import type { Meal, MealDraft, Plan } from '@/domain/schemas/meal';
import type { MealsRepository } from '@/data/repositories/types';
import { request } from './client';

/**
 * Meals and the weekly plan over HTTP (ADR-003).
 *
 * `update` returns `undefined` on a 404 like the other implementations, but it cannot use the
 * shared `patch` helper — the contract replaces a whole draft, so the verb is PUT.
 */

const BASE = '/api/meals';

export const apiMealsRepository: MealsRepository = {
  async list() {
    const { meals } = await request<{ meals: Meal[] }>(BASE);
    return meals;
  },

  async create(draft: MealDraft) {
    const { meal } = await request<{ meal: Meal }>(BASE, {
      method: 'POST',
      body: JSON.stringify(draft),
    });
    return meal;
  },

  async update(id: string, draft: MealDraft) {
    const response = await fetch(`${BASE}/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(draft),
    });

    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`PUT ${BASE}/${id} failed (${response.status})`);

    const { meal } = (await response.json()) as { meal: Meal };
    return meal;
  },

  async remove(id: string) {
    await request<void>(`${BASE}/${id}`, { method: 'DELETE' });
  },

  async getPlan() {
    const { plan } = await request<{ plan: Plan }>(`${BASE}/plan`);
    return plan;
  },

  async assign(day: DayKey, slot: Slot, mealId: string) {
    const { plan } = await request<{ plan: Plan }>(`${BASE}/plan/${day}/${slot}`, {
      method: 'PUT',
      body: JSON.stringify({ mealId }),
    });
    return plan;
  },

  async clear(day: DayKey, slot: Slot) {
    // DELETE returns the updated plan here rather than 204: the caller needs it, and a
    // second round trip to fetch what the server just computed would be waste.
    const { plan } = await request<{ plan: Plan }>(`${BASE}/plan/${day}/${slot}`, {
      method: 'DELETE',
    });
    return plan;
  },
};
