import { describe, expect, it } from 'vitest';
import type { Meal } from '../schemas/meal';
import type { PantryItem } from '../schemas/pantry';
import { describeIngredient, matchMealToPantry, matchPantryItem } from './recipeMatch';

/**
 * The failure that matters is a false positive: telling a family they have something they do
 * not, so they start cooking and find out halfway. Most of these tests are about that
 * direction, not about matching more things.
 */

const pantryItem = (name: string, overrides: Partial<PantryItem> = {}): PantryItem => ({
  id: name,
  name,
  category: 'Pantry',
  quantity: 1,
  unit: 'pack',
  state: 'good',
  ...overrides,
});

const meal = (ingredients: string[]): Meal => ({
  id: 'm1',
  name: 'Test meal',
  minutes: 30,
  serves: 4,
  tags: [],
  description: '',
  ingredients,
});

describe('matchPantryItem', () => {
  const pantry = [
    pantryItem('Beef mince'),
    pantryItem('Rice'),
    pantryItem('Chicken'),
    pantryItem('Chicken breast'),
    pantryItem('Tomatoes'),
  ];

  it('matches an ingredient written name-first with a quantity after it', () => {
    expect(matchPantryItem('Beef mince 500g', pantry)?.name).toBe('Beef mince');
    expect(matchPantryItem('Rice 2 cups', pantry)?.name).toBe('Rice');
  });

  it('matches an exact name with nothing after it', () => {
    expect(matchPantryItem('Rice', pantry)?.name).toBe('Rice');
  });

  it('prefers the more specific item when two could match', () => {
    // "Chicken breast 1kg" means the breast, not the whole-chicken row.
    expect(matchPantryItem('Chicken breast 1kg', pantry)?.name).toBe('Chicken breast');
  });

  it('tolerates a plural difference either way', () => {
    expect(matchPantryItem('Tomato 4', pantry)?.name).toBe('Tomatoes');
    expect(matchPantryItem('Tomatoes 4', [pantryItem('Tomato')])?.name).toBe('Tomato');
  });

  it('does NOT match a different ingredient that merely starts the same way', () => {
    // The false positive this rule exists to prevent: rice vinegar is not rice.
    expect(matchPantryItem('Rice vinegar 100ml', [pantryItem('Rice')])).toBeUndefined();
    expect(matchPantryItem('Chicken stock cubes', [pantryItem('Chicken')])).toBeUndefined();
  });

  it('does not match a pantry name that merely appears inside the ingredient', () => {
    // "Sun-dried tomatoes" is not the tomatoes in the fridge.
    expect(matchPantryItem('Sun dried tomatoes', [pantryItem('Tomatoes')])).toBeUndefined();
  });

  it('returns nothing for an empty pantry or an empty ingredient', () => {
    expect(matchPantryItem('Rice', [])).toBeUndefined();
    expect(matchPantryItem('   ', pantry)).toBeUndefined();
  });

  it('ignores punctuation and casing', () => {
    expect(matchPantryItem('BEEF MINCE, 500g', pantry)?.name).toBe('Beef mince');
  });
});

describe('matchMealToPantry', () => {
  const pantry = [
    pantryItem('Beef mince'),
    pantryItem('Pasta', { state: 'low' }),
    pantryItem('Cheese', { state: 'soon' }),
    pantryItem('Tomatoes', { state: 'out' }),
  ];

  const spaghetti = meal(['Beef mince 500g', 'Pasta 1 pack', 'Tomatoes 4', 'Onion 1', 'Cheese']);

  it('separates what is missing from what is merely low', () => {
    const match = matchMealToPantry(spaghetti, pantry);

    expect(match.missing.map((entry) => entry.ingredient)).toEqual(['Tomatoes 4', 'Onion 1']);
    expect(match.low.map((entry) => entry.ingredient)).toEqual(['Pasta 1 pack', 'Cheese']);
  });

  it('counts an item marked out as missing, not as low', () => {
    // It is a row in the pantry, but there is none in the cupboard. For cooking tonight
    // those are the same thing, and calling it "low" would be misleading.
    const match = matchMealToPantry(meal(['Tomatoes 4']), pantry);
    expect(match.missing).toHaveLength(1);
    expect(match.low).toHaveLength(0);
  });

  it('reports how many of the ingredients are covered', () => {
    const match = matchMealToPantry(spaghetti, pantry);
    expect(match.haveCount).toBe(3);
    expect(match.totalCount).toBe(5);
    expect(match.canCook).toBe(false);
  });

  it('says it can be cooked when nothing is missing, even if things are low', () => {
    const match = matchMealToPantry(meal(['Beef mince 500g', 'Pasta 1 pack']), pantry);
    expect(match.canCook).toBe(true);
    expect(match.low).toHaveLength(1);
  });

  it('treats a meal with no ingredients as cookable rather than as an error', () => {
    // Meals added without an ingredient list are allowed; they should not read as blocked.
    const match = matchMealToPantry(meal([]), pantry);
    expect(match.canCook).toBe(true);
    expect(match.totalCount).toBe(0);
  });

  it('reports everything missing against an empty pantry', () => {
    const match = matchMealToPantry(spaghetti, []);
    expect(match.missing).toHaveLength(5);
    expect(match.haveCount).toBe(0);
  });
});

describe('describeIngredient', () => {
  it('uses the pantry name once matched, dropping the quantity', () => {
    const match = matchMealToPantry(meal(['Beef mince 500g']), [pantryItem('Beef mince')]);
    expect(describeIngredient(match.ingredients[0]!)).toBe('Beef mince');
  });

  it('trims a trailing quantity off an unmatched ingredient', () => {
    // "Need Onion 1" reads badly on a wall display; "Need Onion" does not.
    const match = matchMealToPantry(meal(['Onion 1', 'Chicken breast 1kg']), []);
    expect(describeIngredient(match.ingredients[0]!)).toBe('Onion');
    expect(describeIngredient(match.ingredients[1]!)).toBe('Chicken breast');
  });

  it('leaves an ingredient with no trailing quantity alone', () => {
    // Guessing where the name ends would turn "Soy sauce" into "Soy".
    const match = matchMealToPantry(meal(['Soy sauce']), []);
    expect(describeIngredient(match.ingredients[0]!)).toBe('Soy sauce');
  });

  it('never trims away the whole name', () => {
    const match = matchMealToPantry(meal(['500g']), []);
    expect(describeIngredient(match.ingredients[0]!)).toBe('500g');
  });
});
