import { NextResponse } from 'next/server';
import { predictReorders } from '@/domain/services/reorderPrediction';
import { serverRepositories } from '@/server/repositories';
import { failed } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const repos = await serverRepositories();
    const events = await repos.inventoryEvents.list();
    return NextResponse.json({ suggestions: predictReorders(events) });
  } catch (error) {
    return failed(error);
  }
}
