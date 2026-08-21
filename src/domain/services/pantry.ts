import type { PantryItem } from '../schemas/pantry';
import type { StockState } from '../schemas/common';

export interface PantryCounts {
  good: number;
  /** Low plus "use soon" — both mean the item needs attention but is not gone. */
  low: number;
  out: number;
  /** Everything that is not `good`. */
  attention: number;
}

export function countPantry(items: PantryItem[]): PantryCounts {
  const good = items.filter((item) => item.state === 'good').length;
  const low = items.filter((item) => item.state === 'low' || item.state === 'soon').length;
  const out = items.filter((item) => item.state === 'out').length;
  return { good, low, out, attention: items.length - good };
}

export function needsAttention(item: PantryItem): boolean {
  return item.state !== 'good';
}

/**
 * Stock state after a quantity adjustment.
 *
 * Reaching zero always means `out`. Restocking something that was `out` moves
 * it to `low` rather than `good`, because one unit is rarely a full restock —
 * the family confirms `good` explicitly from the edit sheet.
 */
export function nextStockState(current: StockState, quantity: number): StockState {
  if (quantity === 0) return 'out';
  if (current === 'out') return 'low';
  return current;
}

export function adjustQuantity(item: PantryItem, delta: number): PantryItem {
  const quantity = Math.max(0, item.quantity + delta);
  return { ...item, quantity, state: nextStockState(item.state, quantity) };
}

/** Human summary used as the row subtitle when an item has no note. */
export function describeStock(item: PantryItem): string {
  return item.note ?? `${item.quantity} ${item.unit} left`;
}
