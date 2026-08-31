import type { OrderLineItem } from '../schemas/orderHistory';

/**
 * Turns imported order history into "what does this household usually buy" (Stage 5).
 *
 * Pure and read-only: nothing here writes to the shopping list. It is the data a "common
 * order" quick-add and a future reorder-prediction upgrade both read from — matching the same
 * "AI/automation reads a summary, a person acts on it" shape used throughout the project.
 */

export interface CommonOrderEntry {
  name: string;
  unit: string;
  timesOrdered: number;
  lastOrderedOn: string;
  /** Rounded to a sensible "add this many" default, not the raw historical average. */
  typicalQuantity: number;
  matchedProductId?: string;
  matchedProductName?: string;
}

const round = (value: number, places = 2): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/**
 * Groups lines by name (case/whitespace-insensitive), most-ordered first.
 *
 * `excludeNames` is for staples the household deliberately buys elsewhere — bread from a
 * bakery, say — so a "common order" does not keep suggesting something this retailer's history
 * will never usefully predict.
 */
export function summariseCommonOrder(
  lines: OrderLineItem[],
  options: { excludeNames?: string[]; limit?: number } = {},
): CommonOrderEntry[] {
  const excluded = new Set((options.excludeNames ?? []).map((name) => name.trim().toLowerCase()));

  const groups = new Map<string, OrderLineItem[]>();
  for (const line of lines) {
    const key = line.name.trim().toLowerCase();
    if (excluded.has(key)) continue;
    const existing = groups.get(key);
    if (existing) existing.push(line);
    else groups.set(key, [line]);
  }

  const entries: CommonOrderEntry[] = [...groups.values()].map((group) => {
    const sorted = [...group].sort((a, b) => (a.orderedOn < b.orderedOn ? 1 : -1));
    const latest = sorted[0]!;
    const averageQuantity = group.reduce((total, line) => total + line.quantity, 0) / group.length;
    return {
      name: latest.name,
      unit: latest.unit,
      timesOrdered: group.length,
      lastOrderedOn: latest.orderedOn,
      typicalQuantity: round(averageQuantity, latest.unit === 'ea' ? 0 : 2) || latest.quantity,
      matchedProductId: latest.matchedProductId,
      matchedProductName: latest.matchedProductName,
    };
  });

  entries.sort((a, b) => b.timesOrdered - a.timesOrdered || (a.lastOrderedOn < b.lastOrderedOn ? 1 : -1));
  return options.limit ? entries.slice(0, options.limit) : entries;
}

export interface PurchaseCadenceSuggestion {
  itemName: string;
  reason: 'due-for-reorder';
  /** Average days between past orders of this item. */
  everyDays: number;
  daysSinceLast: number;
  matchedProductId?: string;
  matchedProductName?: string;
}

const daysBetween = (earlier: string, later: string): number =>
  Math.round((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86_400_000);

/**
 * Flags items whose usual reorder interval has passed, from real order dates rather than pantry
 * usage events (`predictReorders` in `reorderPrediction.ts`) — "you buy this roughly every 7
 * days, and it's been 9" is a stronger signal than an inventory adjustment ever was.
 *
 * Needs at least two distinct order dates for an item: a single purchase has no interval to
 * compare against, so it is never flagged, never guessed at. Advisory only, same as
 * `predictReorders` — this never adds anything to the shopping list itself.
 */
export function predictReordersFromHistory(
  lines: OrderLineItem[],
  now = new Date(),
  options: { excludeNames?: string[] } = {},
): PurchaseCadenceSuggestion[] {
  const excluded = new Set((options.excludeNames ?? []).map((name) => name.trim().toLowerCase()));
  const today = now.toISOString().slice(0, 10);

  const groups = new Map<string, OrderLineItem[]>();
  for (const line of lines) {
    const key = line.name.trim().toLowerCase();
    if (excluded.has(key)) continue;
    const existing = groups.get(key);
    if (existing) existing.push(line);
    else groups.set(key, [line]);
  }

  const suggestions: PurchaseCadenceSuggestion[] = [];
  for (const group of groups.values()) {
    const orderedDates = [...new Set(group.map((line) => line.orderedOn))].sort();
    if (orderedDates.length < 2) continue;

    const gaps = orderedDates.slice(1).map((date, index) => daysBetween(orderedDates[index]!, date));
    const everyDays = Math.round(gaps.reduce((total, gap) => total + gap, 0) / gaps.length);
    if (everyDays <= 0) continue;

    const lastOrderedOn = orderedDates[orderedDates.length - 1]!;
    const daysSinceLast = daysBetween(lastOrderedOn, today);
    if (daysSinceLast < everyDays) continue;

    const latest = group.find((line) => line.orderedOn === lastOrderedOn)!;
    suggestions.push({
      itemName: latest.name,
      reason: 'due-for-reorder',
      everyDays,
      daysSinceLast,
      matchedProductId: latest.matchedProductId,
      matchedProductName: latest.matchedProductName,
    });
  }

  return suggestions.sort((a, b) => (b.daysSinceLast - b.everyDays) - (a.daysSinceLast - a.everyDays));
}
