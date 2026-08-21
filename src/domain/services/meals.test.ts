import { describe, expect, it } from 'vitest';
import type { Meal, Plan } from '../schemas/meal';
import type { Product } from '../schemas/product';
import type { PantryItem } from '../schemas/pantry';
import {
  countPlannedDinners,
  findMeal,
  ingredientsToShoppingDrafts,
  matchProduct,
  mealFor,
  pantryItemToShoppingDraft,
  UNKNOWN_ITEM_PRICE,
} from './meals';

const meal: Meal = {
  id: 'm1',
  name: 'Beef Tacos',
  minutes: 25,
  serves: 5,
  tags: ['Quick'],
  image: '/meals/beef-tacos.jpg',
  description: '',
  ingredients: ['Beef mince 500g', 'Taco shells'],
};

const beefMince: Product = {
  id: 'pr7',
  name: 'Beef mince',
  brand: 'Prime',
  size: '500g pack',
  category: 'Meat & Seafood',
  price: 9.99,
  defaultQuantity: 1,
  unit: 'pack',
  favourite: true,
  timesBought: 21,
};

const plan: Plan = { mon: { dinner: 'm1' }, tue: {}, wed: { lunch: 'm1' } };

describe('mealFor', () => {
  it('finds an assigned slot', () => {
    expect(mealFor(plan, 'mon', 'dinner')).toBe('m1');
  });

  it('returns undefined for an empty slot or an unplanned day', () => {
    expect(mealFor(plan, 'tue', 'dinner')).toBeUndefined();
    expect(mealFor(plan, 'sun', 'dinner')).toBeUndefined();
  });
});

describe('findMeal', () => {
  it('returns undefined rather than throwing for a missing id', () => {
    expect(findMeal([meal], undefined)).toBeUndefined();
    expect(findMeal([meal], 'nope')).toBeUndefined();
  });
});

describe('countPlannedDinners', () => {
  it('counts only dinners', () => {
    expect(countPlannedDinners(plan, ['mon', 'tue', 'wed'])).toBe(1);
  });
});

describe('matchProduct', () => {
  it('matches an ingredient written name-first', () => {
    expect(matchProduct('Beef mince 500g', [beefMince])).toBe(beefMince);
  });

  it('is case-insensitive', () => {
    expect(matchProduct('beef mince 700g', [beefMince])).toBe(beefMince);
  });

  it('does not match an unrelated ingredient', () => {
    expect(matchProduct('Taco shells', [beefMince])).toBeUndefined();
  });
});

describe('ingredientsToShoppingDrafts', () => {
  it('prices known products from the catalogue and notes the meal', () => {
    const [known, unknown] = ingredientsToShoppingDrafts(meal, [beefMince]);
    expect(known).toMatchObject({
      name: 'Beef mince',
      category: 'Meat & Seafood',
      price: 9.99,
      unit: 'pack',
      note: 'For Beef Tacos',
    });
    expect(unknown).toMatchObject({
      name: 'Taco shells',
      category: 'Pantry',
      price: UNKNOWN_ITEM_PRICE,
      unit: 'item',
    });
  });

  it('never marks generated items as priority', () => {
    expect(ingredientsToShoppingDrafts(meal, [beefMince]).every((draft) => !draft.priority)).toBe(true);
  });
});

describe('pantryItemToShoppingDraft', () => {
  const pantryItem: PantryItem = {
    id: 'p1',
    name: 'Beef mince',
    category: 'Meat & Seafood',
    quantity: 0,
    unit: 'pack',
    state: 'out',
  };

  it('flags an out-of-stock item as priority and prices it from the catalogue', () => {
    expect(pantryItemToShoppingDraft(pantryItem, [beefMince])).toMatchObject({
      name: 'Beef mince',
      priority: true,
      price: 9.99,
      quantity: 1,
    });
  });

  it('does not flag a merely low item, and falls back on price', () => {
    expect(pantryItemToShoppingDraft({ ...pantryItem, state: 'low', name: 'Cumin' }, [])).toMatchObject({
      priority: false,
      price: UNKNOWN_ITEM_PRICE,
    });
  });
});
