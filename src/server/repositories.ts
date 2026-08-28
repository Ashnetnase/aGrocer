import { eq } from 'drizzle-orm';
import { createDrizzleRepositories } from '@/data/drizzle/drizzleRepositories';
import type { AgrocerRepositories } from '@/data/repositories/types';
import { getDb } from '@/db/client';
import { householdMembers } from '@/db/schema';
import { authEnabled } from '@/auth/config';
import { currentUser } from '@/auth/server';

/**
 * Server-side repository access for route handlers.
 *
 * This is the single place a request becomes a household, and it always was — Stage 2 built it
 * as the seam authentication would replace, and this is that replacement. Handlers ask for
 * repositories, never for an id; keep it that way.
 *
 * The resolution is: signed-in user → the `household_members` row carrying their `user_id` →
 * that row's `household_id`. A user with no member row has no household and is refused, which
 * is what makes `npm run db:claim` a deliberate act rather than a formality.
 *
 * Nothing here may be imported from a client component. `getDb()` pulls in the `postgres`
 * driver, whose Node built-ins fail the client build, so a mistake surfaces at build time
 * rather than as a leaked connection string.
 */

/** Why a request has no household. The caller maps these to status codes; see `src/server/http.ts`. */
export type AuthFailure = 'unauthenticated' | 'no-household';

export class AuthError extends Error {
  readonly reason: AuthFailure;

  constructor(reason: AuthFailure, message: string) {
    super(message);
    this.name = 'AuthError';
    this.reason = reason;
  }
}

/**
 * The escape hatch, for local work against a database without signing in.
 *
 * Warns on every request on purpose: this path leaves every route handler open, so it must be
 * impossible to leave switched on without noticing.
 */
function householdFromEnvironment(): string {
  const householdId = process.env.AGROCER_HOUSEHOLD_ID;
  if (!householdId) {
    throw new AuthError(
      'no-household',
      'AGROCER_AUTH is "off" but AGROCER_HOUSEHOLD_ID is not set. Run `npm run db:seed` and copy the id it prints into .env.local.',
    );
  }
  console.warn(
    '[auth] AGROCER_AUTH="off" — every route handler is unauthenticated. Never do this where the app is reachable.',
  );
  return householdId;
}

/** Resolves the household for the current request, or throws `AuthError`. */
export async function currentHouseholdId(): Promise<string> {
  if (!authEnabled()) return householdFromEnvironment();

  const user = await currentUser();
  if (!user) throw new AuthError('unauthenticated', 'No signed-in user');

  const [member] = await getDb()
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, user.id))
    .limit(1);

  if (!member) {
    // A real account with no family profile attached. Deliberately not auto-created: joining a
    // household is `npm run db:claim`, so that signing up can never grant access by itself.
    throw new AuthError(
      'no-household',
      `Signed-in user ${user.id} is not linked to any household member. Link them with \`npm run db:claim\`.`,
    );
  }

  return member.householdId;
}

export async function serverRepositories(): Promise<AgrocerRepositories> {
  return createDrizzleRepositories(getDb(), await currentHouseholdId());
}
