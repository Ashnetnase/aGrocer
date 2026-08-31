import { CATEGORIES, type Category } from '../schemas/common';
import type { ShoppingItem } from '../schemas/shopping';

export interface ShoppingSummary {
  total: number;
  trolleyTotal: number;
  remaining: ShoppingItem[];
  checked: ShoppingItem[];
  /** 0–100, for the progress bars on Home, Shopping and Shopping Mode. */
  progress: number;
}

export function lineTotal(item: ShoppingItem): number {
  return item.price * item.quantity;
}

export function summariseShopping(items: ShoppingItem[]): ShoppingSummary {
  const remaining = items.filter((item) => !item.checked);
  const checked = items.filter((item) => item.checked);
  const total = items.reduce((sum, item) => sum + lineTotal(item), 0);
  const trolleyTotal = checked.reduce((sum, item) => sum + lineTotal(item), 0);
  const progress = items.length ? (checked.length / items.length) * 100 : 0;
  return { total, trolleyTotal, remaining, checked, progress };
}

export interface ShoppingBudgetSummary {
  target: number;
  total: number;
  /** Positive while under budget, negative when the list is over. */
  remaining: number;
  /** Capped at 100 for a progress bar; `over` carries the important overflow state. */
  progress: number;
  over: boolean;
}

/** Compares the current list estimate with the household's optional weekly target. */
export function summariseShoppingBudget(
  total: number,
  target: number | null | undefined,
): ShoppingBudgetSummary | undefined {
  if (target == null || target <= 0) return undefined;
  const remaining = target - total;
  return {
    target,
    total,
    remaining,
    progress: Math.min((total / target) * 100, 100),
    over: remaining < 0,
  };
}

export interface CategoryGroup {
  category: Category;
  items: ShoppingItem[];
}

/**
 * Groups items in supermarket-aisle order (the `CATEGORIES` order), dropping
 * empty groups. Shopping Mode passes only the unchecked items.
 */
export function groupByCategory(items: ShoppingItem[]): CategoryGroup[] {
  return CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}

/** Case-insensitive match against the items still to buy. */
export function isOnList(items: ShoppingItem[], name: string): boolean {
  const needle = name.trim().toLowerCase();
  return items.some((item) => !item.checked && item.name.toLowerCase() === needle);
}

export function findUncheckedByName(items: ShoppingItem[], name: string): ShoppingItem | undefined {
  const needle = name.trim().toLowerCase();
  return items.find((item) => !item.checked && item.name.toLowerCase() === needle);
}
