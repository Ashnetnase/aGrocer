import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dayKeySchema, idSchema, slotSchema } from '@/domain/schemas/common';
import { serverRepositories } from '@/server/repositories';
import { failed, parseJson } from '@/server/http';

/**
 * One slot in the weekly plan: `PUT` a meal into it, `DELETE` to empty it.
 *
 * The slot is the address rather than part of a body, because a slot is a real place —
 * Wednesday dinner exists whether or not anything is planned for it. Both verbs return the
 * whole plan, which is what the contract promises and what the planner screen re-renders.
 *
 * `day` and `slot` come from the URL, so they are validated as strictly as any body: an
 * unknown day is a 400, not a query that quietly matches nothing.
 */

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ mealId: idSchema });

type Context = { params: Promise<{ day: string; slot: string }> };

async function slotFrom({ params }: Context) {
  const { day, slot } = await params;
  const parsed = z.object({ day: dayKeySchema, slot: slotSchema }).safeParse({ day, slot });
  return parsed.success ? parsed.data : undefined;
}

export async function PUT(request: Request, context: Context) {
  try {
    const target = await slotFrom(context);
    if (!target) return NextResponse.json({ error: 'Unknown day or slot' }, { status: 400 });

    const body = await parseJson(request, bodySchema);
    if (!body.ok) return body.response;

    const plan = await serverRepositories().meals.assign(
      target.day,
      target.slot,
      body.data.mealId,
    );
    return NextResponse.json({ plan });
  } catch (error) {
    return failed(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const target = await slotFrom(context);
    if (!target) return NextResponse.json({ error: 'Unknown day or slot' }, { status: 400 });

    const plan = await serverRepositories().meals.clear(target.day, target.slot);
    return NextResponse.json({ plan });
  } catch (error) {
    return failed(error);
  }
}
