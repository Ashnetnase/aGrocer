import { describe, expect, it } from 'vitest';
import type { Meal, Plan } from '../schemas/meal';
import type { Product } from '../schemas/product';
import type { PantryItem } from '../schemas/pantry';
import {
  countPlannedDinners,
  countPlannedUses,
  estimateMealCost,
  findMeal,
  formatMealIngredient,
  ingredientsToShoppingDrafts,
  matchProduct,
  mealFor,
  parseMealIngredient,
  pantryItemToShoppingDraft,
  removeMealFromPlan,
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

describe('countPlannedUses', () => {
  it('counts every slot across the week that uses a meal', () => {
    expect(countPlannedUses(plan, 'm1')).toBe(2);
  });

  it('is zero for a meal that is not planned', () => {
    expect(countPlannedUses(plan, 'm9')).toBe(0);
  });
});

describe('removeMealFromPlan', () => {
  it('strips the meal from every slot it was planned into', () => {
    const next = removeMealFromPlan(plan, 'm1');
    expect(countPlannedUses(next, 'm1')).toBe(0);
  });

  it('leaves other meals untouched', () => {
    const busy: Plan = { mon: { dinner: 'm1', lunch: 'm2' }, tue: { dinner: 'm2' } };
    const next = removeMealFromPlan(busy, 'm1');
    expect(next.mon).toEqual({ lunch: 'm2' });
    expect(next.tue).toEqual({ dinner: 'm2' });
  });

  it('is a no-op for a meal that was never planned', () => {
    expect(removeMealFromPlan(plan, 'nope')).toEqual(plan);
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

describe('structured meal ingredients', () => {
  it('upgrades a legacy name-first ingredient without losing its display meaning', () => {
    const ingredient = parseMealIngredient('Beef mince 500g');
    expect(ingredient).toEqual({ name: 'Beef mince', amount: 500, unit: 'g' });
    expect(formatMealIngredient(ingredient)).toBe('Beef mince 500 g');
  });

  it('keeps an unquantified legacy ingredient editable', () => {
    expect(parseMealIngredient('Taco shells')).toEqual({
      name: 'Taco shells',
      amount: 1,
      unit: 'item',
    });
  });
});

describe('estimateMealCost', () => {
  it('prices the recipe amount proportionally against a catalogue package', () => {
    const estimate = estimateMealCost({
      ...meal,
      ingredientDetails: [{ name: 'Beef mince', amount: 250, unit: 'g', productId: beefMince.id }],
    }, [beefMince]);
    expect(estimate).toEqual({
      total: 5,
      pricedIngredients: 1,
      totalIngredients: 1,
      complete: true,
    });
  });

  it('marks a total incomplete when any ingredient lacks a compatible catalogue price', () => {
    const estimate = estimateMealCost({
      ...meal,
      ingredientDetails: [
        { name: 'Beef mince', amount: 500, unit: 'g', productId: beefMince.id },
        { name: 'Cumin', amount: 1, unit: 'tsp' },
      ],
    }, [beefMince]);
    expect(estimate).toMatchObject({ pricedIngredients: 1, totalIngredients: 2, complete: false });
  });

  it('does not invent a total for a legacy meal that has not been structured yet', () => {
    expect(estimateMealCost(meal, [beefMince])).toMatchObject({ total: 0, complete: false });
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

  it('rounds a structured recipe amount up to whole catalogue packages', () => {
    const [draft] = ingredientsToShoppingDrafts({
      ...meal,
      ingredientDetails: [
        { name: 'Beef mince', amount: 750, unit: 'g', productId: beefMince.id },
      ],
    }, [beefMince]);
    expect(draft?.quantity).toBe(2);
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
