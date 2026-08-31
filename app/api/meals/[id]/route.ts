import { NextResponse } from 'next/server';
import { mealDraftSchema } from '@/domain/schemas/meal';
import { serverRepositories } from '@/server/repositories';
import { failed, notFound, parseJson } from '@/server/http';

/**
 * One meal: `PUT` to replace it, `DELETE` to remove it.
 *
 * `PUT` rather than `PATCH` because the contract takes a whole draft — the meal form edits
 * every field at once, so a partial update would be a shape the UI never sends.
 *
 * Deleting a meal also frees any plan slots holding it: `plan_entries.meal_id` cascades, so
 * the database guarantees what Stage 1 had to remember by hand.
 */

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const body = await parseJson(request, mealDraftSchema);
    if (!body.ok) return body.response;

    const meal = await (await serverRepositories()).meals.update(id, body.data);
    return meal ? NextResponse.json({ meal }) : notFound('Meal');
  } catch (error) {
    return failed(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    await (await serverRepositories()).meals.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return failed(error);
  }
}
