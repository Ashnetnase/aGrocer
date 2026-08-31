import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getRecipeProvider } from '@/recipes/provider';
import { RecipeError } from '@/recipes/types';
import { currentHouseholdId } from '@/server/repositories';
import { failed } from '@/server/http';

/**
 * Recipe search (Stage 4).
 *
 * A thin proxy to whichever provider `getRecipeProvider()` returns. It exists rather than the
 * browser calling the provider directly so that a keyed provider's key never reaches a client
 * bundle, the provider can change without shipping new JavaScript, and — the reason it is
 * authenticated — nobody outside the household can use this deployment as a free proxy or
 * spend its API quota.
 *
 * `currentHouseholdId()` is the gate. It is more than strictly needed (searching a public
 * recipe database touches no household data) but it is the same gate as everything else, and
 * a route that is "open because it seemed harmless" is how open proxies happen.
 */

export const dynamic = 'force-dynamic';

const querySchema = z.object({ q: z.string().trim().min(2).max(60) });

export async function GET(request: Request) {
  try {
    await currentHouseholdId();

    const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!query.success) {
      // Two characters minimum: a one-letter search returns most of the catalogue and is
      // never what somebody meant.
      return NextResponse.json({ error: 'Enter at least two characters' }, { status: 400 });
    }

    const provider = getRecipeProvider();
    const recipes = await provider.search(query.data.q);

    return NextResponse.json({ recipes, provider: provider.name });
  } catch (error) {
    if (error instanceof RecipeError) {
      console.error('[api/recipes]', error.kind, error.message);
      return NextResponse.json(
        { error: error.publicMessage, kind: error.kind },
        { status: error.kind === 'unreachable' ? 503 : 502 },
      );
    }
    return failed(error);
  }
}
