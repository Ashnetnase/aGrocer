import { NextResponse } from 'next/server';
import { getRecipeProvider } from '@/recipes/provider';
import { RecipeError } from '@/recipes/types';
import { currentHouseholdId } from '@/server/repositories';
import { failed, notFound } from '@/server/http';

/**
 * One recipe, with its ingredients already parsed into the app's structured form.
 *
 * Returns the provider's data only. **Nothing is saved here** — the client hands it to the
 * same review sheet a pasted recipe goes through, and the person confirms it into the meal
 * form. One path into the meal store, whatever the recipe came from.
 */

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await currentHouseholdId();

    const { id } = await params;
    const recipe = await getRecipeProvider().get(id);
    if (!recipe) return notFound('Recipe');

    return NextResponse.json({ recipe });
  } catch (error) {
    if (error instanceof RecipeError) {
      console.error('[api/recipes/:id]', error.kind, error.message);
      return NextResponse.json(
        { error: error.publicMessage, kind: error.kind },
        { status: error.kind === 'unreachable' ? 503 : 502 },
      );
    }
    return failed(error);
  }
}
