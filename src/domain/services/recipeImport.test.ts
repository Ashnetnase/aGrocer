import { describe, expect, it } from 'vitest';
import { importRecipeText, parseImportedIngredient } from './recipeImport';

/**
 * The rule these tests defend: **never invent, never silently drop**. A recipe that imports
 * eighty per cent correctly and tells you about the rest is useful. One that quietly adds an
 * ingredient nobody wrote, or loses one that was there, is worse than typing it out.
 */

describe('parseImportedIngredient', () => {
  it('reads the amount-first form recipes actually use', () => {
    expect(parseImportedIngredient('500g beef mince')).toEqual({
      name: 'Beef mince',
      amount: 500,
      unit: 'g',
    });
    expect(parseImportedIngredient('2 cups rice')).toEqual({
      name: 'Rice',
      amount: 2,
      unit: 'cups',
    });
  });

  it('handles a unit glued to the number and one separated from it', () => {
    expect(parseImportedIngredient('400ml coconut milk')?.unit).toBe('ml');
    expect(parseImportedIngredient('400 ml coconut milk')?.unit).toBe('ml');
  });

  it('reads fractions, mixed numbers and the unicode ones', () => {
    expect(parseImportedIngredient('1/2 cup milk')?.amount).toBe(0.5);
    expect(parseImportedIngredient('1 1/2 cups flour')?.amount).toBe(1.5);
    expect(parseImportedIngredient('½ tsp salt')?.amount).toBe(0.5);
    expect(parseImportedIngredient('1/3 cup oil')?.amount).toBe(0.333);
  });

  it('takes the lower bound of a range, because guessing high wastes food', () => {
    expect(parseImportedIngredient('2-3 apples')?.amount).toBe(2);
  });

  it('drops preparation notes after a comma — they are for the cook, not the list', () => {
    expect(parseImportedIngredient('1 onion, finely diced')).toEqual({
      name: 'Onion',
      amount: 1,
      unit: 'item',
    });
  });

  it('drops parenthetical asides', () => {
    expect(parseImportedIngredient('250g pasta (about 2 cups)')).toEqual({
      name: 'Pasta',
      amount: 250,
      unit: 'g',
    });
  });

  it('strips list bullets of every shape', () => {
    for (const bullet of ['- ', '* ', '• ', '▢ ']) {
      expect(parseImportedIngredient(`${bullet}500g beef mince`)?.name).toBe('Beef mince');
    }
  });

  it('keeps an unquantified ingredient at one unit rather than dropping it', () => {
    // "Salt and pepper" is a real ingredient. Losing it is worse than a wrong amount the
    // person can see and fix.
    expect(parseImportedIngredient('Salt and pepper')).toEqual({
      name: 'Salt and pepper',
      amount: 1,
      unit: 'item',
    });
  });

  it('does not treat an unrecognised word as a unit', () => {
    // "large" is not a unit; it belongs to the name.
    expect(parseImportedIngredient('2 large eggs')).toEqual({
      name: 'Large eggs',
      amount: 2,
      unit: 'item',
    });
  });

  it('removes the "of" in "2 cups of rice"', () => {
    expect(parseImportedIngredient('2 cups of rice')?.name).toBe('Rice');
  });

  it('calms shouted text without mangling ordinary casing', () => {
    expect(parseImportedIngredient('500G BEEF MINCE')?.name).toBe('Beef mince');
    expect(parseImportedIngredient('500g Beef Mince')?.name).toBe('Beef Mince');
  });

  it('returns nothing for a line with no ingredient in it', () => {
    expect(parseImportedIngredient('')).toBeUndefined();
    expect(parseImportedIngredient('   ')).toBeUndefined();
    expect(parseImportedIngredient('- ')).toBeUndefined();
    expect(parseImportedIngredient('12345')).toBeUndefined();
  });

  it('refuses a divide by zero rather than producing Infinity', () => {
    // "1/0 cup" is nonsense, and NaN in an amount field is worse than an unparsed line.
    expect(parseImportedIngredient('1/0 cup milk')?.amount).not.toBe(Infinity);
  });
});

describe('importRecipeText', () => {
  const withHeading = `Spaghetti Bolognese

Serves 4
Prep 10 minutes, cook 25 minutes

Ingredients
- 500g beef mince
- 1 onion, diced
- 2 cloves garlic
- 400g tinned tomatoes
- Salt and pepper

Method
1. Brown the mince for 5 minutes.
2. Add everything else and simmer for 20 minutes.`;

  it('reads the title, serves and total time', () => {
    const recipe = importRecipeText(withHeading);
    expect(recipe.name).toBe('Spaghetti Bolognese');
    expect(recipe.serves).toBe(4);
    // 10 + 25 from the header, plus 5 + 20 from the method — every duration mentioned.
    expect(recipe.minutes).toBe(60);
  });

  it('takes ingredients only from the ingredients section', () => {
    const recipe = importRecipeText(withHeading);

    expect(recipe.ingredients.map((i) => i.name)).toEqual([
      'Beef mince',
      'Onion',
      'Garlic',
      'Tinned tomatoes',
      'Salt and pepper',
    ]);
    // The crucial one: "simmer for 20 minutes" must not become an ingredient.
    expect(recipe.ingredients.some((i) => /simmer|brown/i.test(i.name))).toBe(false);
  });

  it('stops at the method heading', () => {
    const recipe = importRecipeText(withHeading);
    expect(recipe.ingredients).toHaveLength(5);
  });

  it('falls back to quantity-led lines when there is no heading', () => {
    const recipe = importRecipeText(`Quick omelette
3 eggs
20g butter
Whisk the eggs and cook for 4 minutes.`);

    expect(recipe.ingredients.map((i) => i.name)).toEqual(['Eggs', 'Butter']);
    expect(recipe.name).toBe('Quick omelette');
  });

  it('surfaces a line it could not read instead of discarding it', () => {
    const recipe = importRecipeText(`Test

Ingredients
- 500g beef mince
- ???
`);

    expect(recipe.ingredients).toHaveLength(1);
    expect(recipe.unparsed).toEqual(['- ???']);
  });

  it('returns nothing rather than guessing at empty input', () => {
    expect(importRecipeText('')).toEqual({ ingredients: [], unparsed: [] });
    expect(importRecipeText('   \n  \n')).toEqual({ ingredients: [], unparsed: [] });
  });

  it('does not treat a heading or an ingredient as the title', () => {
    const recipe = importRecipeText(`Ingredients
- 2 eggs`);
    expect(recipe.name).toBeUndefined();
  });

  it('leaves serves and minutes undefined rather than inventing them', () => {
    const recipe = importRecipeText(`Toast

Ingredients
- 2 slices bread`);

    expect(recipe.serves).toBeUndefined();
    expect(recipe.minutes).toBeUndefined();
  });

  it('ignores an implausible serves count rather than accepting it', () => {
    // "Serves 400" is a parse error, not a party.
    expect(importRecipeText('Serves 400\n\nIngredients\n- 2 eggs').serves).toBeUndefined();
  });

  it('reads hours as well as minutes', () => {
    expect(importRecipeText('Slow roast\nCook for 2 hours\n\nIngredients\n- 1 lamb').minutes)
      .toBe(120);
  });

  it('handles "Servings: 6" as well as "Serves 6"', () => {
    expect(importRecipeText('Curry\nServings: 6\n\nIngredients\n- 1 onion').serves).toBe(6);
  });
});
