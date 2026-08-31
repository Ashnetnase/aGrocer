import { describe, expect, it } from 'vitest';
import { predictReordersFromHistory, summariseCommonOrder } from './orderHistory';
import type { OrderLineItem } from '../schemas/orderHistory';

function line(overrides: Partial<OrderLineItem>): OrderLineItem {
  return {
    id: 'x',
    retailer: 'new-world',
    name: 'Pams Standard Milk 3l',
    quantity: 1,
    unit: 'ea',
    totalPrice: 7.65,
    orderedOn: '2026-08-01',
    ...overrides,
  };
}

describe('summariseCommonOrder', () => {
  it('ranks the most frequently bought item first', () => {
    const lines = [
      line({ name: 'Milk', orderedOn: '2026-08-01' }),
      line({ name: 'Milk', orderedOn: '2026-08-08' }),
      line({ name: 'Milk', orderedOn: '2026-08-15' }),
      line({ name: 'Salmon', orderedOn: '2026-08-08' }),
    ];
    const result = summariseCommonOrder(lines);
    expect(result[0]!.name).toBe('Milk');
    expect(result[0]!.timesOrdered).toBe(3);
    expect(result[1]!.name).toBe('Salmon');
  });

  it('uses the most recent order date and name spelling', () => {
    const result = summariseCommonOrder([
      line({ name: 'milk', orderedOn: '2026-08-01' }),
      line({ name: 'Milk', orderedOn: '2026-08-15' }),
    ]);
    expect(result[0]!.lastOrderedOn).toBe('2026-08-15');
    expect(result[0]!.name).toBe('Milk');
  });

  it('excludes named staples the household buys elsewhere', () => {
    const result = summariseCommonOrder(
      [line({ name: 'Bread' }), line({ name: 'Milk' })],
      { excludeNames: ['bread'] },
    );
    expect(result.map((entry) => entry.name)).toEqual(['Milk']);
  });

  it('respects a limit', () => {
    const result = summariseCommonOrder(
      [line({ name: 'A' }), line({ name: 'B' }), line({ name: 'C' })],
      { limit: 2 },
    );
    expect(result).toHaveLength(2);
  });
});

describe('predictReordersFromHistory', () => {
  it('flags an item once its usual interval has passed', () => {
    // Bought every 7 days, last one 9 days before "now" — overdue.
    const lines = [
      line({ name: 'Milk', orderedOn: '2026-08-01' }),
      line({ name: 'Milk', orderedOn: '2026-08-08' }),
      line({ name: 'Milk', orderedOn: '2026-08-15' }),
    ];
    const result = predictReordersFromHistory(lines, new Date('2026-08-24T00:00:00Z'));
    expect(result).toEqual([
      { itemName: 'Milk', reason: 'due-for-reorder', everyDays: 7, daysSinceLast: 9, matchedProductId: undefined, matchedProductName: undefined },
    ]);
  });

  it('does not flag an item still within its usual interval', () => {
    const lines = [
      line({ name: 'Milk', orderedOn: '2026-08-01' }),
      line({ name: 'Milk', orderedOn: '2026-08-15' }),
    ];
    // Every 14 days, only 5 days since the last one.
    const result = predictReordersFromHistory(lines, new Date('2026-08-20T00:00:00Z'));
    expect(result).toEqual([]);
  });

  it('never flags an item bought only once — no interval to learn from', () => {
    const lines = [line({ name: 'Salmon', orderedOn: '2026-01-01' })];
    const result = predictReordersFromHistory(lines, new Date('2026-08-24T00:00:00Z'));
    expect(result).toEqual([]);
  });

  it('excludes named staples the household buys elsewhere', () => {
    const lines = [
      line({ name: 'Bread', orderedOn: '2026-08-01' }),
      line({ name: 'Bread', orderedOn: '2026-08-08' }),
    ];
    const result = predictReordersFromHistory(lines, new Date('2026-08-24T00:00:00Z'), { excludeNames: ['bread'] });
    expect(result).toEqual([]);
  });

  it('carries the matched catalogue product through when the line has one', () => {
    const lines = [
      line({ name: 'Milk', orderedOn: '2026-08-01' }),
      line({ name: 'Milk', orderedOn: '2026-08-08', matchedProductId: 'p1', matchedProductName: 'Anchor Blue Milk 2L' }),
    ];
    const result = predictReordersFromHistory(lines, new Date('2026-08-20T00:00:00Z'));
    expect(result[0]?.matchedProductId).toBe('p1');
    expect(result[0]?.matchedProductName).toBe('Anchor Blue Milk 2L');
  });
});
