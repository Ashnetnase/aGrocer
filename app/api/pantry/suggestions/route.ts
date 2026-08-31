import { NextResponse } from 'next/server';
import { mergeReorderSuggestions, predictReorders } from '@/domain/services/reorderPrediction';
import { predictReordersFromHistory } from '@/domain/services/orderHistory';
import { serverRepositories } from '@/server/repositories';
import { failed } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const repos = await serverRepositories();
    const [events, orderHistory] = await Promise.all([
      repos.inventoryEvents.list(),
      repos.orderHistory.list(),
    ]);

    const suggestions = mergeReorderSuggestions(predictReordersFromHistory(orderHistory), predictReorders(events));
    return NextResponse.json({ suggestions });
  } catch (error) {
    return failed(error);
  }
}
