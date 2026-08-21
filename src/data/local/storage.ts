import type { z } from 'zod';

/**
 * Schema-validated localStorage access (ADR-004).
 *
 * Anything that fails validation — corrupted JSON, data written by an older
 * version of the app — falls back to the seed rather than crashing the UI.
 * This is the trust boundary the master plan asks Zod to guard.
 */

const PREFIX = 'agrocer:v1:';

export const STORAGE_KEYS = {
  pantry: `${PREFIX}pantry`,
  shopping: `${PREFIX}shopping`,
  meals: `${PREFIX}meals`,
  plan: `${PREFIX}plan`,
  products: `${PREFIX}products`,
  household: `${PREFIX}household`,
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

function hasStorage(): boolean {
  // Server render, or a browser with storage disabled (private mode, embedded webview).
  if (typeof window === 'undefined') return false;
  try {
    const probe = `${PREFIX}probe`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function readJson<T>(key: StorageKey, schema: z.ZodType<T>, fallback: T): T {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn(`[agrocer] discarding invalid stored data for "${key}"`, parsed.error.issues);
      return fallback;
    }
    return parsed.data;
  } catch (error) {
    console.warn(`[agrocer] could not read "${key}"`, error);
    return fallback;
  }
}

export function writeJson<T>(key: StorageKey, value: T): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Quota exceeded is the realistic failure here. Losing a write is better
    // than losing the screen the family is looking at.
    console.warn(`[agrocer] could not persist "${key}"`, error);
  }
}

export function clearAll(): void {
  if (!hasStorage()) return;
  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore — a failed clear is not worth surfacing to the family.
    }
  }
}
