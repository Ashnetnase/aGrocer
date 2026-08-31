import { NextResponse } from 'next/server';
import { pantryItemDraftSchema } from '@/domain/schemas/pantry';
import { serverRepositories } from '@/server/repositories';
import { failed, parseJson } from '@/server/http';

/**
 * The pantry: `GET` everything, `POST` one item.
 *
 * No batch add, unlike shopping — the pantry has no equivalent of "add these five things
 * from a meal", so a route that accepted an array would be speculative.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await (await serverRepositories()).pantry.list();
    return NextResponse.json({ items });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, pantryItemDraftSchema);
    if (!body.ok) return body.response;

    const item = await (await serverRepositories()).pantry.create(body.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return failed(error);
  }
}
