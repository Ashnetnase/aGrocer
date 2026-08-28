/**
 * Shared fetch plumbing for the HTTP repository implementations.
 *
 * Two conventions the handlers and these helpers agree on:
 *
 *   - a write returns the row the server produced, never a value guessed here
 *   - `404` means "no such id", which the contracts express as `undefined` rather than
 *     as an exception
 *   - `401` is the session expiring, and is handled centrally rather than by each caller —
 *     see `authFailure.ts`
 */
import { handleUnauthorized, NotInHouseholdError } from './authFailure';

/**
 * The one place a failed response becomes an exception.
 *
 * A 401 navigates to sign-in and then throws anyway: the navigation is not instant, and the
 * caller must not carry on as though the request had succeeded in the meantime.
 */
async function fail(method: string, url: string, response: Response): Promise<never> {
  if (handleUnauthorized(response.status)) {
    throw new Error('Session expired — signing in again');
  }
  if (response.status === 403) throw new NotInHouseholdError();

  // The handlers deliberately return a generic message; the detail is in the server log.
  const detail: unknown = await response.json().catch(() => null);
  const message =
    detail && typeof detail === 'object' && 'error' in detail && typeof detail.error === 'string'
      ? `: ${detail.error}`
      : '';
  throw new Error(`${method} ${url} failed (${response.status})${message}`);
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  });

  if (!response.ok) await fail(init?.method ?? 'GET', url, response);

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/**
 * A PATCH whose `404` is a legitimate answer rather than a failure.
 *
 * `key` names the field the handler wraps its resource in — `item`, `product`, `meal`. The
 * envelope is per-resource rather than generic so that responses read as themselves in a
 * network log, which is worth one argument here.
 */
export async function patch<T>(
  url: string,
  body: unknown,
  key = 'item',
): Promise<T | undefined> {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.status === 404) return undefined;
  if (!response.ok) await fail('PATCH', url, response);

  const payload = (await response.json()) as Record<string, T>;
  return payload[key];
}
