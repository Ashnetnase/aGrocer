import { z } from 'zod';
import type { MealIngredient } from '@/domain/schemas/meal';
import { parseImportedIngredient } from '@/domain/services/recipeImport';
import { RecipeError, type RecipeDetail, type RecipeProvider, type RecipeSummary } from './types';

/**
 * TheMealDB (https://www.themealdb.com/api.php).
 *
 * Chosen as the first provider because it needs no API key and has no practical quota, so it
 * can be exercised freely in development and in CI. The trade is a small, eclectic catalogue —
 * a few hundred international recipes — which is fine for proving the seam and thin for a
 * family. Spoonacular is the intended second implementation, and the moment it earns its keep
 * is `findByIngredients`, which is what pantry-aware planning wants.
 *
 * Everything TheMealDB-shaped lives in this file. Nothing outside `src/recipes/` imports it.
 *
 * **Key `1` is their documented free development key.** It is not a secret, which is why it is
 * a default here rather than an environment variable — though `THEMEALDB_KEY` overrides it for
 * anyone who supports them on Patreon and gets a real one.
 */

const BASE = 'https://www.themealdb.com/api/json/v1';
const TIMEOUT_MS = 10_000;

/**
 * Their responses are loosely typed and full of nulls, so everything is optional and the
 * mapper decides what is usable. `passthrough` keeps the twenty numbered ingredient fields,
 * which are impractical to declare and are read by index below.
 */
const mealSchema = z
  .object({
    idMeal: z.string(),
    strMeal: z.string(),
    strMealThumb: z.string().nullish(),
    strCategory: z.string().nullish(),
    strArea: z.string().nullish(),
    strInstructions: z.string().nullish(),
    strSource: z.string().nullish(),
  })
  .passthrough();

/** `meals` is `null` — not an empty array — when nothing matches. */
const responseSchema = z.object({ meals: z.array(mealSchema).nullable() });

type MealRow = z.infer<typeof mealSchema>;

export interface TheMealDbOptions {
  key?: string;
  /** Injected in tests. Defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
}

export function createTheMealDbProvider(options: TheMealDbOptions = {}): RecipeProvider {
  const key = options.key ?? process.env.THEMEALDB_KEY ?? '1';
  const doFetch = options.fetchImpl ?? fetch;

  async function call(path: string): Promise<unknown> {
    let response: Response;
    try {
      response = await doFetch(`${BASE}/${key}/${path}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new RecipeError(
        'unreachable',
        `Could not reach TheMealDB at ${BASE}/${path}`,
        'Recipe search is unavailable right now.',
        error,
      );
    }

    if (!response.ok) {
      throw new RecipeError(
        'upstream',
        `TheMealDB answered ${response.status} for ${path}`,
        'Recipe search is unavailable right now.',
      );
    }

    return response.json();
  }

  function parse(payload: unknown, path: string): MealRow[] {
    const parsed = responseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new RecipeError(
        'upstream',
        `Unexpected response shape from TheMealDB ${path}: ${parsed.error.message}`,
        'Recipe search returned something unreadable.',
      );
    }
    return parsed.data.meals ?? [];
  }

  return {
    name: 'themealdb',

    async search(query) {
      const trimmed = query.trim();
      if (trimmed === '') return [];
      const path = `search.php?s=${encodeURIComponent(trimmed)}`;
      return parse(await call(path), path).map(toSummary);
    },

    async get(id) {
      const path = `lookup.php?i=${encodeURIComponent(id)}`;
      const [row] = parse(await call(path), path);
      return row ? toDetail(row) : undefined;
    },
  };
}

function toSummary(row: MealRow): RecipeSummary {
  return {
    id: row.idMeal,
    title: row.strMeal,
    thumbnail: row.strMealThumb ?? undefined,
    category: row.strCategory ?? undefined,
    area: row.strArea ?? undefined,
  };
}

/**
 * Their ingredients arrive as twenty pairs of `strIngredient{n}` / `strMeasure{n}`, mostly
 * empty, with the measure written amount-first: `"500g"` + `"lean minced beef"`.
 *
 * Concatenating them gives exactly the form `parseImportedIngredient` already reads, so the
 * pasted-text parser is reused rather than a second one written. That matters beyond tidiness:
 * two parsers would drift, and a family would get different results from pasting a recipe and
 * importing the same recipe.
 */
function toDetail(row: MealRow): RecipeDetail {
  const ingredients: MealIngredient[] = [];
  const unparsed: string[] = [];

  for (let index = 1; index <= 20; index += 1) {
    const name = String(row[`strIngredient${index}`] ?? '').trim();
    if (name === '') continue;
    const measure = String(row[`strMeasure${index}`] ?? '').trim();

    // A measure with no digit in it is a section label, not a quantity — "Topping",
    // "To serve". Dropping it and keeping the ingredient is right; feeding it to the parser
    // would produce "Topping parmesan".
    const line = /\d/.test(measure) ? `${measure} ${name}` : name;

    const parsed = parseImportedIngredient(line);
    if (parsed) ingredients.push(parsed);
    else unparsed.push(`${measure} ${name}`.trim());
  }

  return {
    ...toSummary(row),
    ingredients,
    instructions: (row.strInstructions ?? '').trim(),
    sourceUrl: row.strSource ?? `https://www.themealdb.com/meal/${row.idMeal}`,
    unparsed,
  };
}
