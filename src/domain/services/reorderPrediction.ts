/** A read-only inventory event needed for reorder suggestions. */
export interface InventoryUsageEvent {
  itemName: string;
  kind: 'created' | 'adjusted' | 'updated' | 'removed';
  quantityDelta?: number | null;
  quantityAfter?: number | null;
  createdAt: Date | string;
}

export interface ReorderSuggestion {
  itemName: string;
  /** `due-for-reorder` comes from real order-history cadence — see `predictReordersFromHistory`. */
  reason: 'repeated-use' | 'recently-empty' | 'due-for-reorder';
  uses?: number;
  everyDays?: number;
  daysSinceLast?: number;
  matchedProductId?: string;
  matchedProductName?: string;
}

/**
 * Finds conservative reorder candidates from a recent event window. This is deliberately
 * advisory: callers may display it, but must not add shopping items without confirmation.
 */
export function predictReorders(
  events: InventoryUsageEvent[],
  now = new Date(),
  windowDays = 30,
): ReorderSuggestion[] {
  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const recent = events.filter((event) => Number.isFinite(new Date(event.createdAt).getTime()) && new Date(event.createdAt).getTime() >= cutoff);
  const byName = new Map<string, { uses: number; empty: boolean }>();
  for (const event of recent) {
    const name = event.itemName.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const current = byName.get(key) ?? { uses: 0, empty: false };
    if (event.kind === 'adjusted' && (event.quantityDelta ?? 0) < 0) current.uses += 1;
    if (event.quantityAfter === 0) current.empty = true;
    byName.set(key, current);
  }
  return [...byName.entries()]
    .filter(([, value]) => value.empty || value.uses >= 3)
    .map(([key, value]) => ({
      itemName: recent.find((event) => event.itemName.trim().toLowerCase() === key)?.itemName.trim() ?? key,
      reason: (value.empty ? 'recently-empty' : 'repeated-use') as ReorderSuggestion['reason'],
      uses: value.uses,
    }))
    .sort((a, b) => Number(b.reason === 'recently-empty') - Number(a.reason === 'recently-empty') || b.uses - a.uses);
}

/**
 * Combines the pantry-activity signal with the order-history cadence signal
 * (`predictReordersFromHistory` in `orderHistory.ts`), used identically by `/api/pantry/
 * suggestions` and the `getReorderSuggestions` assistant tool so the two never drift apart.
 * Where both flag the same item, the cadence one wins — it is backed by real order dates
 * rather than an inventory-adjustment heuristic.
 */
export function mergeReorderSuggestions(
  fromHistory: ReorderSuggestion[],
  fromPantry: ReorderSuggestion[],
): ReorderSuggestion[] {
  const flaggedByHistory = new Set(fromHistory.map((suggestion) => suggestion.itemName.toLowerCase()));
  return [...fromHistory, ...fromPantry.filter((suggestion) => !flaggedByHistory.has(suggestion.itemName.toLowerCase()))];
}
