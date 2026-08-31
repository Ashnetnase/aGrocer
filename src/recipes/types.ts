import type { MealIngredient } from '@/domain/schemas/meal';

/**
 * Recipe providers (Stage 4).
 *
 * The same seam as `AiProvider` (ADR-014) and the repositories (ADR-003): features depend on
 * this interface, and exactly one place decides which implementation answers. TheMealDB is
 * first because it needs no key and has no quota, so it can be built and tested freely —
 * including in CI. Spoonacular is the obvious second, and the point of having two is that an
 * abstraction with one implementation is a guess.
 *
 * Deliberately narrow: **search by name, and fetch one recipe.** Not browse, not
 * recommendations, not nutrition. A provider that only has to do two things can be swapped
 * without argument.
 */

export interface RecipeSummary {
  /** Provider-scoped. Meaningless to any other provider, so never stored on a meal. */
  id: string;
  title: string;
  thumbnail?: string;
  /** "Beef", "Dessert" — free text from the provider, shown but never relied on. */
  category?: string;
  /** "Italian", "Thai". */
  area?: string;
}

export interface RecipeDetail extends RecipeSummary {
  ingredients: MealIngredient[];
  instructions: string;
  /** Where it came from, so a family can check the original. */
  sourceUrl?: string;
  /**
   * Ingredient rows the provider gave that could not be read into an amount and a name.
   * Surfaced rather than dropped, exactly as with pasted text — an importer that quietly
   * loses an ingredient is one you cannot trust.
   */
  unparsed: string[];
}

export interface RecipeProvider {
  /** Stable identifier for logs: `themealdb`, later `spoonacular`. */
  readonly name: string;
  search(query: string): Promise<RecipeSummary[]>;
  /** `undefined` when the id is unknown, rather than throwing. */
  get(id: string): Promise<RecipeDetail | undefined>;
}

export type RecipeErrorKind = 'unreachable' | 'upstream' | 'config';

export class RecipeError extends Error {
  readonly kind: RecipeErrorKind;
  /** Safe to show a person. `message` may name the provider and stays in the server log. */
  readonly publicMessage: string;

  constructor(kind: RecipeErrorKind, message: string, publicMessage: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'RecipeError';
    this.kind = kind;
    this.publicMessage = publicMessage;
  }
}
