import type { AgrocerRepositories } from '@/data/repositories/types';
import { localRepositories } from '@/data/local/localRepositories';
import { apiHouseholdRepository } from './householdRepository';
import { apiMealsRepository } from './mealsRepository';
import { apiPantryRepository } from './pantryRepository';
import { apiProductsRepository } from './productsRepository';
import { apiShoppingRepository } from './shoppingRepository';
import { apiFeedbackRepository } from './feedbackRepository';

/**
 * Every feature over HTTP (ADR-003).
 *
 * Named for the client side of the wire, not the server: `serverRepositories()` in
 * `src/server/repositories.ts` is the Drizzle-backed set these handlers call into.
 *
 * The localStorage implementation is deliberately kept rather than deleted — it is what runs
 * when the flag is off, what the provider's tests use, and the fallback when the database is
 * unreachable during development.
 */
export const apiRepositories: AgrocerRepositories = {
  inventoryEvents: { async list() { return []; } },
  pantry: apiPantryRepository,
  shopping: apiShoppingRepository,
  meals: apiMealsRepository,
  products: apiProductsRepository,
  household: apiHouseholdRepository,
  feedback: apiFeedbackRepository,

  /**
   * Stage 1's `reset()` restored the demo data in localStorage. Re-seeding the database is
   * `npm run db:seed` — a deliberate script, never something a screen can call. The Drizzle
   * implementation refuses it for the same reason.
   */
  async reset() {
    throw new Error(
      'reset() is not supported against the database. Use `npm run db:seed` instead.',
    );
  },
};

/**
 * Server-backed data is opt-in. Without the flag the app needs no database at all, which
 * keeps Stage 1 runnable — and keeps a broken connection from taking the app down.
 *
 * One flag covers every feature: per-feature flags would multiply the combinations needing
 * testing without buying anything, since they share a single database.
 */
export function usesServerData(): boolean {
  return process.env.NEXT_PUBLIC_AGROCER_SERVER_DATA === '1';
}

export function repositoriesForEnvironment(): AgrocerRepositories {
  return usesServerData() ? apiRepositories : localRepositories;
}
