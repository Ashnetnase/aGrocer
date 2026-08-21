import type { PantryItem } from '@/domain/schemas/pantry';

/** Ported verbatim from the Magic Patterns demo data. */
export const pantrySeed: PantryItem[] = [
  { id: 'p1', name: 'Milk', category: 'Dairy', quantity: 1, unit: '2L bottle', state: 'low', note: 'Half a bottle left' },
  { id: 'p2', name: 'Eggs', category: 'Dairy', quantity: 8, unit: 'eggs', state: 'good' },
  { id: 'p3', name: 'Bread', category: 'Bakery', quantity: 1, unit: 'loaf', state: 'soon', note: 'Best before Thursday' },
  { id: 'p4', name: 'Chicken breast', category: 'Meat & Seafood', quantity: 1, unit: 'kg', state: 'good' },
  { id: 'p5', name: 'Beef mince', category: 'Meat & Seafood', quantity: 500, unit: 'g', state: 'good' },
  { id: 'p6', name: 'Rice', category: 'Pantry', quantity: 2, unit: 'kg', state: 'good' },
  { id: 'p7', name: 'Pasta', category: 'Pantry', quantity: 1, unit: 'pack', state: 'low' },
  { id: 'p8', name: 'Cheese', category: 'Dairy', quantity: 1, unit: 'block', state: 'low', note: 'Half remaining' },
  { id: 'p9', name: 'Bananas', category: 'Fruit & Vegetables', quantity: 4, unit: 'bananas', state: 'soon', note: 'Going spotty' },
  { id: 'p10', name: 'Frozen peas', category: 'Frozen', quantity: 1, unit: 'bag', state: 'good' },
  { id: 'p11', name: 'Yoghurt', category: 'Dairy', quantity: 0, unit: 'pottle', state: 'out' },
  { id: 'p12', name: 'Tomatoes', category: 'Fruit & Vegetables', quantity: 0, unit: 'tomatoes', state: 'out' },
  { id: 'p13', name: 'Wraps', category: 'Bakery', quantity: 1, unit: 'pack', state: 'good' },
  { id: 'p14', name: 'Dishwasher tablets', category: 'Household', quantity: 12, unit: 'tablets', state: 'good' },
  { id: 'p15', name: 'Apple juice', category: 'Drinks', quantity: 1, unit: 'bottle', state: 'low' },
  { id: 'p16', name: 'Muesli bars', category: 'Snacks', quantity: 6, unit: 'bars', state: 'good' },
];
