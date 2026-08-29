import { NextResponse } from 'next/server';
import { serverRepositories } from '@/server/repositories';
import { failed } from '@/server/http';
import { getShoppingProvider } from '@/shopping/provider';
import { prepareTrolley } from '@/shopping/prepare';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const repositories = await serverRepositories();
    const provider = getShoppingProvider();
    const lines = await prepareTrolley(await repositories.shopping.list(), provider);
    return NextResponse.json({ provider: provider.displayName, lines, checkout: 'manual' });
  } catch (error) {
    return failed(error);
  }
}
