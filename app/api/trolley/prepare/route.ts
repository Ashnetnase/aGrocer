import { NextResponse } from 'next/server';
import { serverRepositories } from '@/server/repositories';
import { failed } from '@/server/http';
import { getShoppingProvider } from '@/shopping/provider';
import { prepareTrolley } from '@/shopping/prepare';
import { serverShoppingProductRepository } from '@/server/repositories';
import { NewWorldCompanionClient } from '@/shopping/companion';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const repositories = await serverRepositories();
    const preferences = await serverShoppingProductRepository();
    const provider = getShoppingProvider();
    const storeId = process.env.NEW_WORLD_STORE_ID || undefined;
    const lines = await prepareTrolley(await repositories.shopping.list(), provider, preferences, storeId);
    const online = await new NewWorldCompanionClient().health();
    const summary = {
      total: lines.length,
      ready: lines.filter((line) => line.status === 'ready').length,
      needsReview: lines.filter((line) => line.status === 'needs-review').length,
      unavailable: lines.filter((line) => line.status === 'unavailable').length,
      estimatedTotal: lines.reduce((total, line) => total + (line.product?.specialPrice ?? line.product?.price ?? 0) * line.requestedQuantity, 0),
    };
    return NextResponse.json({
      provider: provider.displayName,
      lines,
      summary,
      companion: { online, ...(!online ? { message: 'New World Companion offline. Matching memory still works, but products cannot be added.' } : {}) },
      checkout: 'manual',
    });
  } catch (error) {
    return failed(error);
  }
}
