/**
 * An in-memory stand-in for `window.localStorage`, for testing the Stage 1
 * repositories in a Node environment.
 *
 * Deliberately faithful to the real thing in the ways the repositories depend
 * on: values are stored as strings, missing keys return `null`, and the quota
 * can be made to fail on demand.
 */
export interface FakeStorage extends Storage {
  /** Makes every subsequent `setItem` throw, mimicking a full quota. */
  failWrites(reason?: string): void;
  /** Raw access for tests that need to plant malformed data. */
  seed(key: string, raw: string): void;
}

export function createFakeStorage(): FakeStorage {
  let store = new Map<string, string>();
  let writeError: string | null = null;

  return {
    get length() {
      return store.size;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (writeError) throw new Error(writeError);
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store = new Map();
    },
    failWrites(reason = 'QuotaExceededError') {
      writeError = reason;
    },
    seed(key: string, raw: string) {
      store.set(key, raw);
    },
  };
}

/**
 * Installs a fake `window` carrying the storage, and returns a teardown.
 * The repositories only ever touch `window.localStorage`.
 */
export function installFakeStorage(): { storage: FakeStorage; restore: () => void } {
  const storage = createFakeStorage();
  const globalRef = globalThis as { window?: unknown };
  const previous = globalRef.window;

  globalRef.window = { localStorage: storage };

  return {
    storage,
    restore() {
      if (previous === undefined) delete globalRef.window;
      else globalRef.window = previous;
    },
  };
}
