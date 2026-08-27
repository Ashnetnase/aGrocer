import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pantryItemPatchSchema } from '@/domain/schemas/pantry';
import { serverRepositories } from '@/server/repositories';
import { failed, notFound, parseJson } from '@/server/http';

/**
 * One pantry item: `PATCH` to edit or step the quantity, `DELETE` to remove.
 *
 * `{ "adjust": n }` is a relative change, not an absolute one, so the stepper stays correct
 * when two people are looking at the same shelf — the repository does the arithmetic in a
 * single statement rather than read-modify-write from the client.
 */

export const dynamic = 'force-dynamic';

const patchBodySchema = z.union([
  z.object({ adjust: z.number().int().refine((n) => n !== 0, 'Adjustment must be non-zero') }),
  pantryItemPatchSchema.refine(
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

    const pantry = serverRepositories().pantry;
    const item =
      'adjust' in body.data
        ? await pantry.adjustQuantity(id, body.data.adjust)
        : await pantry.update(id, body.data);

    return item ? NextResponse.json({ item }) : notFound('Pantry item');
  } catch (error) {
    return failed(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    await serverRepositories().pantry.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return failed(error);
  }
}
