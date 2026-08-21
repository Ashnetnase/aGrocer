import { describe, expect, it } from 'vitest';
import type { PantryItem } from '../schemas/pantry';
import { adjustQuantity, countPantry, describeStock, needsAttention, nextStockState } from './pantry';

const item = (overrides: Partial<PantryItem> = {}): PantryItem => ({
  id: 'p1',
  name: 'Milk',
  category: 'Dairy',
  quantity: 2,
  unit: 'bottle',
  state: 'good',
  ...overrides,
});

describe('nextStockState', () => {
  it('marks anything that hits zero as out', () => {
    expect(nextStockState('good', 0)).toBe('out');
    expect(nextStockState('low', 0)).toBe('out');
  });

  it('promotes an out item to low once some is back', () => {
    expect(nextStockState('out', 1)).toBe('low');
  });

  it('leaves other states alone', () => {
    expect(nextStockState('good', 5)).toBe('good');
    expect(nextStockState('soon', 3)).toBe('soon');
  });
});

describe('adjustQuantity', () => {
  it('never goes below zero', () => {
    expect(adjustQuantity(item({ quantity: 1 }), -5)).toMatchObject({ quantity: 0, state: 'out' });
  });

  it('restocking an out item makes it low', () => {
    expect(adjustQuantity(item({ quantity: 0, state: 'out' }), 1)).toMatchObject({
      quantity: 1,
      state: 'low',
    });
  });

  it('keeps the rest of the item intact', () => {
    const result = adjustQuantity(item({ note: 'Blue top' }), 1);
    expect(result).toMatchObject({ id: 'p1', name: 'Milk', note: 'Blue top', quantity: 3 });
  });
});

describe('countPantry', () => {
  it('counts low and use-soon together, and everything not good as attention', () => {
    const counts = countPantry([
      item({ id: '1', state: 'good' }),
      item({ id: '2', state: 'low' }),
      item({ id: '3', state: 'soon' }),
      item({ id: '4', state: 'out' }),
    ]);
    expect(counts).toEqual({ good: 1, low: 2, out: 1, attention: 3 });
  });

  it('handles an empty pantry', () => {
    expect(countPantry([])).toEqual({ good: 0, low: 0, out: 0, attention: 0 });
  });
});

describe('needsAttention', () => {
  it('is true for anything that is not good', () => {
    expect(needsAttention(item({ state: 'good' }))).toBe(false);
    expect(needsAttention(item({ state: 'soon' }))).toBe(true);
  });
});

describe('describeStock', () => {
  it('prefers the note when there is one', () => {
    expect(describeStock(item({ note: 'Half a bottle left' }))).toBe('Half a bottle left');
  });

  it('falls back to the quantity', () => {
    expect(describeStock(item({ quantity: 3, unit: 'bottles' }))).toBe('3 bottles left');
  });
});
