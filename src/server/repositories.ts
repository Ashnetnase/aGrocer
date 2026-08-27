import { createDrizzleRepositories } from '@/data/drizzle/drizzleRepositories';
import type { AgrocerRepositories } from '@/data/repositories/types';
import { getDb } from '@/db/client';

/**
 * Server-side repository access for route handlers.
 *
 * `AGROCER_HOUSEHOLD_ID` is a deliberate stand-in for authentication: Stage 2 has one
 * household and no users yet, so the id comes from the environment rather than from a
 * session. When Supabase Auth lands this is the single place that changes — the handlers
 * ask for repositories, not for an id.
 *
 * Nothing here may be imported from a client component. `getDb()` pulls in the `postgres`
 * driver, whose Node built-ins fail the client build, so a mistake surfaces at build time
 * rather than as a leaked connection string.
 */
export function serverRepositories(): AgrocerRepositories {
  const householdId = process.env.AGROCER_HOUSEHOLD_ID;
  if (!householdId) {
    throw new Error(
      'AGROCER_HOUSEHOLD_ID is not set. Run `npm run db:seed` and copy the id it prints into .env.local.',
    );
  }
  return createDrizzleRepositories(getDb(), householdId);
}
