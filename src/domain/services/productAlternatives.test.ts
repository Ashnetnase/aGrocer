import { describe, expect, it } from 'vitest';
import { findProductAlternatives } from './productAlternatives';
import type { Product } from '../schemas/product';

const product = (overrides: Partial<Product> = {}): Product => ({ id: '1', name: 'Milk', brand: 'A', size: '1L', category: 'Dairy', price: 3, defaultQuantity: 1, unit: 'bottle', favourite: false, timesBought: 0, ...overrides });

describe('findProductAlternatives', () => {
  it('returns same-category name matches and excludes the original', () => {
    const result = findProductAlternatives(product(), [product(), product({ id: '2', name: 'Organic Milk', price: 4 }), product({ id: '3', name: 'Rice', category: 'Pantry' })]);
    expect(result.map((item) => item.id)).toEqual(['2']);
  });
  it('returns an empty list when there is no meaningful match', () => {
    expect(findProductAlternatives(product(), [product({ id: '2', name: 'Cheese', brand: 'B' })])).toEqual([]);
  });
});
