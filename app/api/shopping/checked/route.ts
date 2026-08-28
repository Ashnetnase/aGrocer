import { NextResponse } from 'next/server';
import { serverRepositories } from '@/server/repositories';
import { failed } from '@/server/http';

/**
 * `DELETE /api/shopping/checked` — clears every checked item at once.
 *
 * A collection of its own rather than a flag on the list route: it is what the "clear
 * checked" button does after a shop, and a bulk delete deserves its own address.
 */

export const dynamic = 'force-dynamic';

export async function DELETE() {
  try {
    await (await serverRepositories()).shopping.clearChecked();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return failed(error);
  }
}
