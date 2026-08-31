import { NextResponse } from 'next/server';
import { z } from 'zod';
import { chorePatchSchema } from '@/domain/schemas/chores';
import { serverRepositories } from '@/server/repositories';
import { failed, notFound, parseJson } from '@/server/http';

/**
 * One chore: `PATCH` to edit or toggle, `DELETE` to remove.
 *
 * Toggling is a PATCH with `{ "toggle": true }` rather than its own route, matching
 * `/api/shopping/[id]` — the same resource changing state, not a different resource.
 */

export const dynamic = 'force-dynamic';

const patchBodySchema = z.union([
  z.object({ toggle: z.literal(true) }),
  chorePatchSchema.refine(
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

    const chores = (await serverRepositories()).chores;
    const chore =
      'toggle' in body.data ? await chores.toggle(id) : await chores.update(id, body.data);

    return chore ? NextResponse.json({ chore }) : notFound('Chore');
  } catch (error) {
    return failed(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    await (await serverRepositories()).chores.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return failed(error);
  }
}
