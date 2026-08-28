import { NextResponse } from 'next/server';
import { z } from 'zod';
import { productPatchSchema } from '@/domain/schemas/product';
import { serverRepositories } from '@/server/repositories';
import { failed, notFound, parseJson } from '@/server/http';

/**
 * One product: `PATCH` to edit, or `{ "toggleFavourite": true }` to star it.
 *
 * Favouriting is a toggle rather than `{ favourite: boolean }` for the same reason the
 * shopping check is: the repository owns the flip, so two taps cannot race to the same value.
 */

export const dynamic = 'force-dynamic';

const patchBodySchema = z.union([
  z.object({ toggleFavourite: z.literal(true) }),
  productPatchSchema.refine(
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

    const products = (await serverRepositories()).products;
    const product =
      'toggleFavourite' in body.data
        ? await products.toggleFavourite(id)
        : await products.update(id, body.data);

    return product ? NextResponse.json({ product }) : notFound('Product');
  } catch (error) {
    return failed(error);
  }
}
