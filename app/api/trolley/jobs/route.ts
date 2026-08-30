import { NextResponse } from 'next/server';
import { failed, parseJson } from '@/server/http';
import { trolleyAddBatchSchema } from '@/shopping/schemas';
import { serverTrolleyJobRepository } from '@/server/repositories';

export const dynamic = 'force-dynamic';

export async function GET() {
  try { return NextResponse.json({ jobs: await (await serverTrolleyJobRepository()).listPending() }); }
  catch (error) { return failed(error); }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, trolleyAddBatchSchema);
    if (!body.ok) return body.response;
    return NextResponse.json(await (await serverTrolleyJobRepository()).create(body.data.items), { status: 201 });
  } catch (error) { return failed(error); }
}
