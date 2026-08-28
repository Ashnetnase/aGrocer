import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleUnauthorized, setAuthRedirect } from './authFailure';

/**
 * The behaviour worth pinning is the difference between 401 and 403. Redirecting on a 403
 * would loop: the account signs in perfectly well, and still is not in a household.
 */

const redirects: string[] = [];

function atPath(pathname: string, search = '') {
  vi.stubGlobal('window', { location: { pathname, search, assign: vi.fn() } });
}

beforeEach(() => {
  redirects.length = 0;
  setAuthRedirect((url) => redirects.push(url));
  atPath('/shopping');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('handleUnauthorized', () => {
  it('sends a 401 to sign-in, carrying where the user was', () => {
    atPath('/shopping', '?filter=dairy');

    expect(handleUnauthorized(401)).toBe(true);
    expect(redirects).toEqual(['/sign-in?next=%2Fshopping%3Ffilter%3Ddairy']);
  });

  it('does not redirect on 403 — signing in again cannot fix a missing household', () => {
    expect(handleUnauthorized(403)).toBe(false);
    expect(redirects).toEqual([]);
  });

  it('leaves ordinary failures alone', () => {
    for (const status of [400, 404, 500, 502]) {
      expect(handleUnauthorized(status)).toBe(false);
    }
    expect(redirects).toEqual([]);
  });

  it('does not redirect when already on the sign-in screen', () => {
    atPath('/sign-in');

    // Still reports that it took over, so the caller does not also raise an error.
    expect(handleUnauthorized(401)).toBe(true);
    expect(redirects).toEqual([]);
  });

  it('does nothing during server rendering, where there is no location to assign', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', undefined);

    expect(handleUnauthorized(401)).toBe(false);
    expect(redirects).toEqual([]);
  });
});
