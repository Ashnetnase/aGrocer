import { NextResponse } from 'next/server';
import { serverRepositories } from '@/server/repositories';
import { failed } from '@/server/http';

/**
 * Links unmatched order-history lines to the household's New World catalogue cache (Stage 5).
 *
 * Idempotent and safe to re-run any time — it only fills in lines still unmatched, and only
 * accepts a high-confidence match (`OrderHistoryRepository.matchToCatalogue`). The catalogue
 * cache grows as the household searches New World elsewhere in the app, so a later run can match
 * something an earlier one couldn't.
 */

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await (await serverRepositories()).orderHistory.matchToCatalogue();
    return NextResponse.json(result);
  } catch (error) {
    return failed(error);
  }
}
