import { describe, expect, it } from 'vitest';
import type { ShoppingItem } from '../schemas/shopping';
import {
  findUncheckedByName,
  groupByCategory,
  isOnList,
  lineTotal,
  summariseShopping,
  summariseShoppingBudget,
} from './shopping';

const item = (overrides: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id: 's1',
  name: 'Milk',
  category: 'Dairy',
  quantity: 1,
  unit: 'bottle',
  price: 4.29,
  priority: false,
  checked: false,
  ...overrides,
});

describe('lineTotal', () => {
  it('multiplies price by quantity', () => {
    expect(lineTotal(item({ price: 4.5, quantity: 2 }))).toBe(9);
  });
});

describe('summariseShopping', () => {
  it('splits remaining from checked and totals both', () => {
    const summary = summariseShopping([
      item({ id: '1', price: 10, quantity: 1 }),
      item({ id: '2', price: 5, quantity: 2, checked: true }),
    ]);
    expect(summary.remaining).toHaveLength(1);
    expect(summary.checked).toHaveLength(1);
    expect(summary.total).toBe(20);
    expect(summary.trolleyTotal).toBe(10);
    expect(summary.progress).toBe(50);
  });

  it('reports zero progress for an empty list rather than NaN', () => {
    expect(summariseShopping([]).progress).toBe(0);
  });

  it('reaches 100 when everything is in the trolley', () => {
    expect(summariseShopping([item({ checked: true })]).progress).toBe(100);
  });
});

describe('summariseShoppingBudget', () => {
  it('reports what remains under the weekly target', () => {
    expect(summariseShoppingBudget(180, 250)).toEqual({
      target: 250,
      total: 180,
      remaining: 70,
      progress: 72,
      over: false,
    });
  });

  it('reports an overrun and caps visual progress at 100 percent', () => {
    expect(summariseShoppingBudget(275, 250)).toEqual({
      target: 250,
      total: 275,
      remaining: -25,
      progress: 100,
      over: true,
    });
  });

  it('returns no summary when the household has not set a target', () => {
    expect(summariseShoppingBudget(180, null)).toBeUndefined();
    expect(summariseShoppingBudget(180, undefined)).toBeUndefined();
  });
});

describe('groupByCategory', () => {
  it('orders groups by aisle order and drops empty ones', () => {
    const groups = groupByCategory([
      item({ id: '1', category: 'Household' }),
      item({ id: '2', category: 'Fruit & Vegetables' }),
      item({ id: '3', category: 'Dairy' }),
    ]);
    expect(groups.map((group) => group.category)).toEqual(['Fruit & Vegetables', 'Dairy', 'Household']);
  });

  it('keeps every item in its group', () => {
    const groups = groupByCategory([item({ id: '1' }), item({ id: '2' })]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items).toHaveLength(2);
  });
});

describe('isOnList', () => {
  it('matches case-insensitively', () => {
    expect(isOnList([item({ name: 'Milk' })], 'milk')).toBe(true);
  });

  it('ignores items already in the trolley', () => {
    expect(isOnList([item({ name: 'Milk', checked: true })], 'Milk')).toBe(false);
  });

  it('ignores surrounding whitespace', () => {
    expect(isOnList([item({ name: 'Milk' })], '  Milk ')).toBe(true);
  });
});

describe('findUncheckedByName', () => {
  it('returns the item so callers can merge quantities', () => {
    const existing = item({ id: 'x', name: 'Bread' });
    expect(findUncheckedByName([existing], 'bread')).toBe(existing);
  });

  it('returns undefined when nothing matches', () => {
    expect(findUncheckedByName([item()], 'Eggs')).toBeUndefined();
  });
});
