import { NextResponse } from 'next/server';
import { z } from 'zod';
import { orderLineItemDraftSchema } from '@/domain/schemas/orderHistory';
import { serverRepositories } from '@/server/repositories';
import { failed, parseJson } from '@/server/http';

/**
 * Imported order history (Stage 5).
 *
 * `GET` the household's history; `POST` one reviewed batch from `OrderImportSheet`. There is no
 * `PATCH` or `DELETE`: this is history, matching `/api/feedback` — a line imported wrong is
 * deleted (out of scope for now, same as feedback) and re-imported, not edited in place.
 */

export const dynamic = 'force-dynamic';

// A real bulk paste is several orders at once — five weekly New World shops alone came to 214
// lines — so this needs headroom well beyond a single order, not just past round numbers.
const importSchema = z.object({ lines: z.array(orderLineItemDraftSchema).min(1).max(2_000) });

export async function GET() {
  try {
    const lines = await (await serverRepositories()).orderHistory.list();
    return NextResponse.json({ lines });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, importSchema);
    if (!body.ok) return body.response;

    const lines = await (await serverRepositories()).orderHistory.importLines(body.data.lines);
    return NextResponse.json({ lines }, { status: 201 });
  } catch (error) {
    return failed(error);
  }
}
