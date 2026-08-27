/**
 * Shared fetch plumbing for the HTTP repository implementations.
 *
 * Two conventions the handlers and these helpers agree on:
 *
 *   - a write returns the row the server produced, never a value guessed here
 *   - `404` means "no such id", which the contracts express as `undefined` rather than
 *     as an exception
 */

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  });

  if (!response.ok) {
    // The handlers deliberately return a generic message; the detail is in the server log.
    const detail: unknown = await response.json().catch(() => null);
    const message =
      detail && typeof detail === 'object' && 'error' in detail && typeof detail.error === 'string'
        ? `: ${detail.error}`
        : '';
    throw new Error(`${init?.method ?? 'GET'} ${url} failed (${response.status})${message}`);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/** A PATCH whose `404` is a legitimate answer rather than a failure. */
export async function patch<T>(url: string, body: unknown): Promise<T | undefined> {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`PATCH ${url} failed (${response.status})`);

  const { item } = (await response.json()) as { item: T };
  return item;
}
