import { NextResponse } from 'next/server';
import { z } from 'zod';
import { failed, parseJson } from '@/server/http';
import { serverRetailerProductSearchJobRepository } from '@/server/repositories';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  shoppingItemId: z.string().trim().min(1).max(200),
  shoppingItemKey: z.string().trim().min(1).max(200),
  query: z.string().trim().min(1).max(120),
  storeId: z.string().trim().max(100).optional(),
});

export async function GET() {
  try {
    return NextResponse.json({ jobs: await (await serverRetailerProductSearchJobRepository()).listPending() });
  } catch (error) {
    return failed(error);
  }
}
export async function POST(request: Request) {
  try {
    const body = await parseJson(request, createSchema);
    if (!body.ok) return body.response;
    return NextResponse.json(await (await serverRetailerProductSearchJobRepository()).create(body.data), { status: 201 });
  } catch (error) {
    return failed(error);
  }
}
