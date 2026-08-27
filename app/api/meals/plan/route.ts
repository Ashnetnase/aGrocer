import { NextResponse } from 'next/server';
import { serverRepositories } from '@/server/repositories';
import { failed } from '@/server/http';

/**
 * The whole weekly plan. Individual slots are addressed at `plan/[day]/[slot]`.
 *
 * This path wins over `/api/meals/[id]` because Next.js matches static segments before
 * dynamic ones — so no meal id can ever shadow it.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plan = await serverRepositories().meals.getPlan();
    return NextResponse.json({ plan });
  } catch (error) {
    return failed(error);
  }
}
