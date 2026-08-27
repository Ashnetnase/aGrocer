import type { AgrocerRepositories } from '@/data/repositories/types';
import { localRepositories } from '@/data/local/localRepositories';
import { apiMealsRepository } from './mealsRepository';
import { apiPantryRepository } from './pantryRepository';
import { apiShoppingRepository } from './shoppingRepository';

/**
 * Stage 2 migrates one feature at a time.
 *
 * Shopping, pantry and meals talk to Postgres through their route handlers; products and
 * household are still Stage 1 localStorage. Composing the two is possible only because both
 * sides implement the same contracts (ADR-003), and it keeps each feature's switch-over
 * independently reversible.
 *
 * `reset()` stays local: it wipes localStorage, and the Drizzle implementation refuses it
 * outright, so nothing it does can reach the database.
 */
export const hybridRepositories: AgrocerRepositories = {
  ...localRepositories,
  shopping: apiShoppingRepository,
  pantry: apiPantryRepository,
  meals: apiMealsRepository,
};

/**
 * Server-backed features are opt-in. Without the flag the app needs no database at all,
 * which keeps Stage 1 runnable — and keeps a broken connection from taking the app down.
 *
 * One flag covers every converted feature: a per-feature flag would multiply the states
 * that need testing without buying anything, since they share one database.
 */
export function repositoriesForEnvironment(): AgrocerRepositories {
  return process.env.NEXT_PUBLIC_AGROCER_SERVER_DATA === '1'
    ? hybridRepositories
    : localRepositories;
}
