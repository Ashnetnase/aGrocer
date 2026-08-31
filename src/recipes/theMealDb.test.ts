import { describe, expect, it, vi } from 'vitest';
import { createTheMealDbProvider } from './theMealDb';
import { RecipeError } from './types';

/**
 * Built against a real response captured from TheMealDB on 2026-08-29, because the interesting
 * cases here are all their data's quirks — `meals: null` for no results, twenty mostly-empty
 * ingredient slots, and measures that are section labels rather than quantities.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Trimmed from the real Spaghetti Bolognese row (id 52770). */
const bolognese = {
  idMeal: '52770',
  strMeal: 'Spaghetti Bolognese',
  strCategory: 'Beef',
  strArea: 'Italian',
  strMealThumb: 'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg',
  strInstructions: 'Fry the onions.',
  strSource: null,
  strIngredient1: 'onions', strMeasure1: '2',
  strIngredient2: 'olive oil', strMeasure2: '1tbsp',
  strIngredient3: 'garlic', strMeasure3: '1 clove',
  strIngredient4: 'lean minced beef', strMeasure4: '500g',
  strIngredient5: 'parmesan', strMeasure5: 'Topping',
  strIngredient6: '', strMeasure6: '',
};

const provider = (impl: (url: string) => Promise<Response>) =>
  createTheMealDbProvider({ fetchImpl: vi.fn(impl) as unknown as typeof fetch });

describe('search', () => {
  it('maps results and uses the free development key by default', async () => {
    const seen: string[] = [];
    const results = await provider(async (url) => {
      seen.push(url);
      return json({ meals: [bolognese] });
    }).search('bolognese');

    expect(seen[0]).toContain('/v1/1/search.php?s=bolognese');
    expect(results).toEqual([
      {
        id: '52770',
        title: 'Spaghetti Bolognese',
        thumbnail: 'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg',
        category: 'Beef',
        area: 'Italian',
      },
    ]);
  });

  it('treats their null `meals` as no results rather than an error', async () => {
    // TheMealDB returns `{"meals": null}` for a miss, which is the shape most likely to
    // crash a naive client.
    await expect(provider(async () => json({ meals: null })).search('zzzz')).resolves.toEqual([]);
  });

  it('does not call out at all for an empty query', async () => {
    const fetchImpl = vi.fn(async () => json({ meals: null }));
    const result = await createTheMealDbProvider({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }).search('   ');

    expect(result).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('classifies an unreachable provider without leaking the address', async () => {
    const error = await provider(async () => {
      throw new TypeError('fetch failed');
    })
      .search('x')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RecipeError);
    expect((error as RecipeError).kind).toBe('unreachable');
    expect((error as RecipeError).publicMessage).not.toContain('themealdb');
  });

  it('classifies a non-2xx answer as upstream', async () => {
    const error = await provider(async () => json({}, 500))
      .search('x')
      .catch((caught: unknown) => caught);
    expect((error as RecipeError).kind).toBe('upstream');
  });

  it('classifies an unreadable body rather than crashing', async () => {
    const error = await provider(async () => json({ meals: 'not an array' }))
      .search('x')
      .catch((caught: unknown) => caught);
    expect((error as RecipeError).kind).toBe('upstream');
  });
});

describe('get', () => {
  it('reads their measure-plus-name pairs into structured ingredients', async () => {
    const recipe = await provider(async () => json({ meals: [bolognese] })).get('52770');

    expect(recipe?.ingredients).toEqual([
      { name: 'Onions', amount: 2, unit: 'item' },
      { name: 'Olive oil', amount: 1, unit: 'tbsp' },
      { name: 'Garlic', amount: 1, unit: 'clove' },
      { name: 'Lean minced beef', amount: 500, unit: 'g' },
      // "Topping" is a section label, not a quantity — the ingredient survives, the label goes.
      { name: 'Parmesan', amount: 1, unit: 'item' },
    ]);
  });

  it('stops at the first empty slot rather than emitting twenty blanks', async () => {
    const recipe = await provider(async () => json({ meals: [bolognese] })).get('52770');
    expect(recipe?.ingredients).toHaveLength(5);
    expect(recipe?.unparsed).toEqual([]);
  });

  it('falls back to a themealdb link when the row has no source', async () => {
    const recipe = await provider(async () => json({ meals: [bolognese] })).get('52770');
    expect(recipe?.sourceUrl).toBe('https://www.themealdb.com/meal/52770');
  });

  it('prefers the row’s own source when there is one', async () => {
    const recipe = await provider(async () =>
      json({ meals: [{ ...bolognese, strSource: 'https://example.com/recipe' }] }),
    ).get('52770');
    expect(recipe?.sourceUrl).toBe('https://example.com/recipe');
  });

  it('returns undefined for an unknown id rather than throwing', async () => {
    await expect(provider(async () => json({ meals: null })).get('nope')).resolves.toBeUndefined();
  });
});
