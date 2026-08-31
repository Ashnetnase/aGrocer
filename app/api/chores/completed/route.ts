import { NextResponse } from 'next/server';
import { serverRepositories } from '@/server/repositories';
import { failed } from '@/server/http';

/** `DELETE /api/chores/completed` — the weekly reset, clearing every done chore at once. */

export const dynamic = 'force-dynamic';

export async function DELETE() {
  try {
    await (await serverRepositories()).chores.clearCompleted();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return failed(error);
  }
}
