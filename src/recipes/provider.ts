import { createTheMealDbProvider } from './theMealDb';
import { RecipeError, type RecipeProvider } from './types';

/**
 * Recipe provider resolution (Stage 4).
 *
 * The single place a provider is chosen, mirroring `getAiProvider()` (ADR-014). Adding
 * Spoonacular means an implementation file and a branch here — nothing in any feature changes.
 *
 * Server-side. The routes proxy the provider rather than the browser calling it directly, for
 * three reasons: a keyed provider's key never reaches a client bundle, the provider can be
 * swapped without shipping new JavaScript, and one place gets to enforce that only signed-in
 * household members can spend somebody's API quota.
 */

const globalForRecipes = globalThis as typeof globalThis & {
  __ashhomeRecipeProvider?: RecipeProvider;
};

export function getRecipeProvider(): RecipeProvider {
  if (globalForRecipes.__ashhomeRecipeProvider) return globalForRecipes.__ashhomeRecipeProvider;

  const name = process.env.RECIPE_PROVIDER ?? 'themealdb';
  if (name !== 'themealdb') {
    throw new RecipeError(
      'config',
      `RECIPE_PROVIDER="${name}" is not implemented. Only "themealdb" exists so far.`,
      'Recipe search is not configured.',
    );
  }

  const provider = createTheMealDbProvider();
  globalForRecipes.__ashhomeRecipeProvider = provider;
  return provider;
}

/** Test seam: drops the cached provider so the next call re-reads the environment. */
export function resetRecipeProvider(): void {
  globalForRecipes.__ashhomeRecipeProvider = undefined;
}
