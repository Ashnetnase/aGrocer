import { NextResponse } from 'next/server';
import { z } from 'zod';
import { shoppingItemDraftSchema } from '@/domain/schemas/shopping';
import { serverRepositories } from '@/server/repositories';
import { failed, parseJson } from '@/server/http';

/**
 * The shopping list: `GET` the whole list, `POST` one item or a batch.
 *
 * Every request is validated with the same Zod schemas the forms use, because a route
 * handler is a public edge — the client having validated already means nothing here.
 */

export const dynamic = 'force-dynamic';

const postBodySchema = z.union([
  shoppingItemDraftSchema,
  z.object({ items: z.array(shoppingItemDraftSchema).min(1) }),
]);

export async function GET() {
  try {
    const items = await serverRepositories().shopping.list();
    return NextResponse.json({ items });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, postBodySchema);
    if (!body.ok) return body.response;

    const shopping = serverRepositories().shopping;
    const items =
      'items' in body.data
        ? await shopping.addMany(body.data.items)
        : [await shopping.add(body.data)];

    return NextResponse.json({ items }, { status: 201 });
  } catch (error) {
    return failed(error);
  }
}
