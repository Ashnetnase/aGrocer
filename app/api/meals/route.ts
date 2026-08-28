import { NextResponse } from 'next/server';
import { mealDraftSchema } from '@/domain/schemas/meal';
import { serverRepositories } from '@/server/repositories';
import { failed, parseJson } from '@/server/http';

/**
 * The meal catalogue: `GET` everything, `POST` a new meal.
 *
 * The weekly plan lives under `/api/meals/plan` rather than here. One repository covers
 * both, but they are different resources: the catalogue is what the family can cook, the
 * plan is what they decided to cook this week.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const meals = await (await serverRepositories()).meals.list();
    return NextResponse.json({ meals });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, mealDraftSchema);
    if (!body.ok) return body.response;

    const meal = await (await serverRepositories()).meals.create(body.data);
    return NextResponse.json({ meal }, { status: 201 });
  } catch (error) {
    return failed(error);
  }
}
