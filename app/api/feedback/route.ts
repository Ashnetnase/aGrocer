import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mealFeedbackDraftSchema } from '@/domain/schemas/feedback';
import { serverRepositories } from '@/server/repositories';
import { failed, parseJson } from '@/server/http';

/**
 * Meal feedback history (Stage 2).
 *
 * `GET` the household's history, optionally narrowed to one meal; `POST` a new record.
 * There is no `PATCH` or `DELETE`: this is history, not state. A rating that turns out to be
 * wrong is corrected by adding a newer one, not by rewriting what was recorded.
 *
 * No screen calls this yet — Stage 4 owns rating a meal. It exists now because the history
 * cannot be backfilled once the dinners have been eaten.
 */

export const dynamic = 'force-dynamic';

const querySchema = z.object({ mealId: z.string().min(1).max(64).optional() });

export async function GET(request: Request) {
  try {
    const query = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!query.success) {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }

    const feedback = await (await serverRepositories()).feedback.list(query.data.mealId);
    return NextResponse.json({ feedback });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, mealFeedbackDraftSchema);
    if (!body.ok) return body.response;

    const feedback = await (await serverRepositories()).feedback.add(body.data);
    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    return failed(error);
  }
}
