import type { ShoppingItem } from '@/domain/schemas/shopping';

/** Ported verbatim from the Magic Patterns demo data. */
export const shoppingSeed: ShoppingItem[] = [
  { id: 's1', name: 'Milk', category: 'Dairy', quantity: 2, unit: '2L bottle', price: 4.29, priority: true, checked: false, note: 'Blue top' },
  { id: 's2', name: 'Bread', category: 'Bakery', quantity: 2, unit: 'loaf', price: 3.5, priority: true, checked: false },
  { id: 's3', name: 'Bananas', category: 'Fruit & Vegetables', quantity: 1, unit: 'kg', price: 3.99, priority: false, checked: false },
  { id: 's4', name: 'Tomatoes', category: 'Fruit & Vegetables', quantity: 6, unit: 'tomatoes', price: 4.5, priority: false, checked: false },
  { id: 's5', name: 'Yoghurt', category: 'Dairy', quantity: 1, unit: '1kg pottle', price: 6.2, priority: false, checked: false, note: 'Greek, plain' },
  { id: 's6', name: 'Chicken breast', category: 'Meat & Seafood', quantity: 1, unit: 'kg', price: 14.5, priority: true, checked: false },
  { id: 's7', name: 'Wraps', category: 'Bakery', quantity: 1, unit: 'pack', price: 4.1, priority: false, checked: false },
  { id: 's8', name: 'Frozen chips', category: 'Frozen', quantity: 1, unit: 'bag', price: 5.5, priority: false, checked: true },
  { id: 's9', name: 'Dishwash liquid', category: 'Household', quantity: 1, unit: 'bottle', price: 4.0, priority: false, checked: true },
];
