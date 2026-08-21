/**
 * Id generation for Stage 1. A Stage 2 backend will supply real ids, so this
 * lives behind the repository layer and never leaks into components.
 */
export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
