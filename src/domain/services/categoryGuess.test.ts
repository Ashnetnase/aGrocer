import { describe, expect, it } from 'vitest';
import { guessCategory } from './categoryGuess';
import type { Product } from '../schemas/product';

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Anchor Blue Milk',
  brand: 'Anchor',
  size: '2L',
  category: 'Dairy',
  price: 4,
  defaultQuantity: 1,
  unit: 'each',
  favourite: false,
  timesBought: 0,
  ...overrides,
});

describe('guessCategory', () => {
  it('matches a known household product exactly, case-insensitively', () => {
    expect(guessCategory('anchor blue milk', [product()])).toBe('Dairy');
  });

  it('falls back to a keyword match when no household product matches', () => {
    expect(guessCategory('Milk', [])).toBe('Dairy');
    expect(guessCategory('Sourdough bread', [])).toBe('Bakery');
    expect(guessCategory('Chicken breast', [])).toBe('Meat & Seafood');
    expect(guessCategory('Bananas', [])).toBe('Fruit & Vegetables');
    expect(guessCategory('Toilet paper', [])).toBe('Household');
  });

  it('prefers a known household product over a generic keyword when both could match', () => {
    const products = [product({ name: 'Value Trim Milk', category: 'Frozen' })];
    // Contrived category to prove the household match wins, not the "milk" keyword.
    expect(guessCategory('Value Trim Milk', products)).toBe('Frozen');
  });

  it('returns undefined rather than guessing when nothing matches', () => {
    expect(guessCategory('Xyzzy Plonk', [])).toBeUndefined();
  });

  it('returns undefined for empty or near-empty input', () => {
    expect(guessCategory('', [])).toBeUndefined();
    expect(guessCategory('a', [])).toBeUndefined();
  });
});
