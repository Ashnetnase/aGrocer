import { NextResponse } from 'next/server';
import { z } from 'zod';
import { shoppingItemPatchSchema } from '@/domain/schemas/shopping';
import { serverRepositories } from '@/server/repositories';
import { failed, notFound, parseJson } from '@/server/http';

/**
 * One shopping item: `PATCH` to edit or toggle, `DELETE` to remove.
 *
 * Toggling is a PATCH with `{ "toggle": true }` rather than its own route, because it is
 * the same resource changing state — and the repository owns what "toggled" means.
 */

export const dynamic = 'force-dynamic';

const patchBodySchema = z.union([
  z.object({ toggle: z.literal(true) }),
  shoppingItemPatchSchema.refine(
    (patch) => Object.keys(patch).length > 0,
    'Patch must change something',
  ),
]);

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const body = await parseJson(request, patchBodySchema);
    if (!body.ok) return body.response;

    const shopping = (await serverRepositories()).shopping;
    const item =
      'toggle' in body.data
        ? await shopping.toggle(id)
        : await shopping.update(id, body.data);

    return item ? NextResponse.json({ item }) : notFound('Shopping item');
  } catch (error) {
    return failed(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    await (await serverRepositories()).shopping.remove(id);
    // Remove is idempotent in the contract, so a missing id is still a success.
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return failed(error);
  }
}
