/**
 * What the browser does when a route handler says the session is gone (ADR-017).
 *
 * The middleware refreshes the session on every *navigation*, which covers ordinary use. It
 * does not cover the wall tablet: a screen that sits open for weeks never navigates, so its
 * refresh token can expire under it. The next tap then gets a 401, and before this the screen
 * showed "Request failed" — technically true and completely useless to somebody standing in a
 * kitchen.
 *
 * So a 401 sends them to sign in, carrying where they were so they come back to it.
 *
 * A **403** deliberately does not redirect. It means the account is real but is not linked to
 * a household, and signing in again cannot fix that — `npm run db:claim` can. Bouncing someone
 * to a sign-in screen that will succeed and then fail again the same way is a loop, not a fix.
 */

/** Distinguishes the two so callers can render 403 rather than bounce on it. */
export class NotInHouseholdError extends Error {
  constructor() {
    super('This account is not part of a household');
    this.name = 'NotInHouseholdError';
  }
}

/**
 * Replaced in tests. A module-level seam rather than a parameter threaded through every
 * repository method, because every call site would pass the same thing.
 */
let redirect: (url: string) => void = (url) => {
  window.location.assign(url);
};

export function setAuthRedirect(next: (url: string) => void): void {
  redirect = next;
}

/**
 * Handles a 401 by navigating to sign-in. Returns `true` if it took over, so the caller can
 * stop rather than throw an error nobody will be around to see.
 */
export function handleUnauthorized(status: number): boolean {
  if (status !== 401) return false;

  // Server-side rendering has no location to assign, and nothing to redirect. The gate is
  // also what makes this safe to import from code that runs in both places.
  if (typeof window === 'undefined') return false;

  // Already on the sign-in screen: redirecting again would spin.
  if (window.location.pathname === '/sign-in') return true;

  const next = `${window.location.pathname}${window.location.search}`;
  redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return true;
}
