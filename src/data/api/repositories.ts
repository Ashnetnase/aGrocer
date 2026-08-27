import type { AgrocerRepositories } from '@/data/repositories/types';
import { localRepositories } from '@/data/local/localRepositories';
import { apiShoppingRepository } from './shoppingRepository';

/**
 * Stage 2 migrates one feature at a time.
 *
 * Shopping talks to Postgres through `/api/shopping`; everything else is still Stage 1
 * localStorage. Composing the two is possible only because both sides implement the same
 * contracts (ADR-003), and it keeps each feature's switch-over independently reversible.
 *
 * `reset()` stays local: it wipes localStorage, and the Drizzle implementation refuses it
 * outright, so nothing it does can reach the database.
 */
export const hybridRepositories: AgrocerRepositories = {
  ...localRepositories,
  shopping: apiShoppingRepository,
};

/**
 * Server-backed shopping is opt-in. Without the flag the app needs no database at all,
 * which keeps Stage 1 runnable — and keeps a broken connection from taking the app down.
 */
export function repositoriesForEnvironment(): AgrocerRepositories {
  return process.env.NEXT_PUBLIC_AGROCER_SERVER_SHOPPING === '1'
    ? hybridRepositories
    : localRepositories;
}
