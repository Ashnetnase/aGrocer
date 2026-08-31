import type { Category } from '../schemas/common';
import type { Product } from '../schemas/product';

/**
 * Guesses a shopping item's category from its name, so adding "milk" defaults to Dairy instead
 * of whatever the form last had selected. A guess, never a lock — the category chip stays fully
 * editable, and nothing here writes anything.
 *
 * Checks the household's own products first — "we already know Anchor Blue Milk is Dairy" beats
 * a generic keyword list — then falls back to a curated set of common NZ grocery words. Returns
 * `undefined` rather than a wrong guess when nothing matches, so the form's existing default
 * (Pantry) stands instead of something confidently incorrect.
 */
export function guessCategory(name: string, products: Product[] = []): Category | undefined {
  const needle = name.trim().toLowerCase();
  if (needle.length < 2) return undefined;

  const known = products.find((product) => product.name.trim().toLowerCase() === needle);
  if (known) return known.category;

  for (const [category, keywords] of KEYWORD_CATEGORIES) {
    if (keywords.some((keyword) => needle.includes(keyword))) return category;
  }
  return undefined;
}

const KEYWORD_CATEGORIES: [Category, string[]][] = [
  ['Dairy', ['milk', 'cheese', 'yoghurt', 'yogurt', 'butter', 'cream', 'egg']],
  ['Bakery', ['bread', 'bun', 'bagel', 'bread roll', 'croissant', 'muffin', 'baguette', 'sourdough']],
  [
    'Meat & Seafood',
    ['chicken', 'beef', 'mince', 'sausage', 'bacon', 'ham', 'fish', 'salmon', 'tuna', 'pork', 'lamb', 'seafood', 'prawn', 'steak'],
  ],
  [
    'Fruit & Vegetables',
    [
      'apple', 'banana', 'orange', 'potato', 'onion', 'tomato', 'lettuce', 'carrot', 'broccoli',
      'grape', 'berry', 'avocado', 'kumara', 'capsicum', 'mushroom', 'spinach', 'pear', 'mandarin',
      'courgette', 'pumpkin', 'celery', 'cucumber', 'lemon', 'lime', 'garlic', 'ginger',
    ],
  ],
  ['Frozen', ['frozen', 'ice cream']],
  ['Drinks', ['juice', 'water', 'soda', 'cola', 'coffee', 'tea', 'kombucha', 'wine', 'beer', 'lemonade']],
  ['Snacks', ['chips', 'crackers', 'biscuit', 'chocolate', 'muesli bar', 'nuts', 'popcorn', 'lollies', 'candy']],
  [
    'Household',
    ['toilet paper', 'paper towel', 'dish liquid', 'detergent', 'soap', 'tissue', 'cleaner', 'nappies', 'nappy', 'wipes', 'shampoo'],
  ],
];
