import type { Meal } from '../schemas/meal';
import type { PantryItem } from '../schemas/pantry';

/**
 * Pantry-to-recipe matching (Stage 4).
 *
 * Answers the question a family actually asks in front of the fridge: *can we make this
 * tonight, and what do we need?* Pure functions over data already in the app — no schema
 * change, and no new burden on whoever types a recipe in.
 *
 * **Matching leans on how people write ingredients: name first, quantity after.** A pantry
 * item matches when its words are the ingredient's leading words *and* what follows is a
 * quantity or nothing. `matchProduct` in `meals.ts` uses a plain prefix test for pricing;
 * this is deliberately stricter, because a wrong price is a rounding error and a wrong
 * "you have this" sends someone to the stove without an onion. See `matchPantryItem`.
 *
 * **What this deliberately does NOT do: quantities.** "Beef mince 500g" against 200g in the
 * freezer reads as in stock. Doing better needs ingredients stored as structured amounts,
 * which means changing how the family enters a recipe — a real cost, and worth paying only
 * once something needs it. Meal cost estimation is the thing that will, and it is still
 * listed as not started for exactly this reason. Until then a *presence* check is honest and
 * useful; a quantity check that is quietly wrong would not be.
 */

export type Availability = 'in-stock' | 'low' | 'missing';

export interface MatchedIngredient {
  /** The ingredient exactly as written on the meal. */
  ingredient: string;
  /** The pantry item it matched, if any. */
  pantryItem?: PantryItem;
  availability: Availability;
}

export interface MealMatch {
  ingredients: MatchedIngredient[];
  /** Not in the pantry at all, or in it but marked out. Both mean "cannot cook with it". */
  missing: MatchedIngredient[];
  /** Present but running low or going off soon — worth a glance, not a blocker. */
  low: MatchedIngredient[];
  /** Anything not missing. The numerator in "4 of 5 ingredients". */
  haveCount: number;
  totalCount: number;
  /** True only when nothing is missing. Low is still cookable. */
  canCook: boolean;
}

/**
 * Crude, predictable singularisation. Not a stemmer: a stemmer's surprises are worse here
 * than its cleverness is useful, because a wrong match tells a family they have something
 * they do not.
 */
function singular(token: string): string {
  if (/[^aeiou](oes|ses|hes|xes|zes)$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

/** Lower-cased words, punctuation dropped, each word singularised. */
function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singular);
}

/**
 * Finds the pantry item an ingredient refers to.
 *
 * The rule encodes the convention ingredients are written in: **name first, quantity after**.
 * A pantry item matches when its words are the ingredient's leading words, and what follows
 * is either nothing or a quantity.
 *
 *   "Rice 2 cups"        → "rice" then "2…"      → matches Rice
 *   "Rice vinegar 100ml" → "rice" then "vinegar" → does NOT match Rice
 *
 * That second case is the whole point. A bare prefix test matches it, and the family is told
 * they can make a stir-fry they cannot. Requiring a quantity — or nothing — after the name is
 * what separates "the thing itself" from "a different thing whose name starts the same way".
 *
 * The cost is that an ingredient written quantity-first ("2 cups rice") will not match. That
 * is a fair trade: it fails towards "check the cupboard", not towards a false promise.
 *
 * Where two items could match, the more specific wins — "Chicken breast" over "Chicken".
 */
export function matchPantryItem(
  ingredient: string,
  pantry: PantryItem[],
): PantryItem | undefined {
  const needle = tokens(ingredient);
  if (needle.length === 0) return undefined;

  const candidates = pantry.filter((item) => {
    const name = tokens(item.name);
    if (name.length === 0 || name.length > needle.length) return false;
    if (!name.every((word, index) => word === needle[index])) return false;

    const rest = needle.slice(name.length);
    return rest.length === 0 || /^\d/.test(rest[0] ?? '');
  });

  return candidates.sort((a, b) => tokens(b.name).length - tokens(a.name).length)[0];
}

function availabilityOf(item: PantryItem | undefined): Availability {
  if (!item) return 'missing';
  // `out` is in the pantry as a row but not in the cupboard. For cooking tonight that is
  // the same as not having it, and grouping it with `low` would be misleading.
  if (item.state === 'out') return 'missing';
  if (item.state === 'low' || item.state === 'soon') return 'low';
  return 'in-stock';
}

export function matchMealToPantry(meal: Meal, pantry: PantryItem[]): MealMatch {
  const ingredients: MatchedIngredient[] = meal.ingredients.map((ingredient) => {
    const pantryItem = matchPantryItem(ingredient, pantry);
    return { ingredient, pantryItem, availability: availabilityOf(pantryItem) };
  });

  const missing = ingredients.filter((entry) => entry.availability === 'missing');
  const low = ingredients.filter((entry) => entry.availability === 'low');

  return {
    ingredients,
    missing,
    low,
    haveCount: ingredients.length - missing.length,
    totalCount: ingredients.length,
    canCook: missing.length === 0,
  };
}

/**
 * The ingredient name to show, shortened to the part a person reads.
 *
 * A matched ingredient uses the pantry's own name, because the pantry knows what the family
 * calls it. An unmatched one has its trailing quantity trimmed — the same name-first
 * convention `matchPantryItem` relies on, so "Onion 1" reads as "Onion" on the wall.
 *
 * Only *trailing* words beginning with a digit are dropped, which is why "Soy sauce" survives
 * intact rather than being guessed at.
 */
export function describeIngredient(entry: MatchedIngredient): string {
  if (entry.pantryItem) return entry.pantryItem.name;

  const words = entry.ingredient.trim().split(/\s+/);
  while (words.length > 1 && /^\d/.test(words[words.length - 1] ?? '')) words.pop();
  return words.join(' ');
}
