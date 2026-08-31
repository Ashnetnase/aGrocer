import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverRepositories } from '@/server/repositories';
import { failed, notFound, parseJson } from '@/server/http';

/** One school notification: `PATCH` to mark read/unread or dismiss. No `DELETE` — see `route.ts`. */

export const dynamic = 'force-dynamic';

const patchBodySchema = z
  .object({ read: z.boolean().optional(), dismissed: z.literal(true).optional() })
  .refine((body) => body.read !== undefined || body.dismissed !== undefined, 'Patch must change something');

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const body = await parseJson(request, patchBodySchema);
    if (!body.ok) return body.response;

    const school = (await serverRepositories()).school;
    const notification =
      body.data.dismissed !== undefined
        ? await school.dismiss(id)
        : await school.markRead(id, body.data.read!);

    return notification ? NextResponse.json({ notification }) : notFound('School notification');
  } catch (error) {
    return failed(error);
  }
}
