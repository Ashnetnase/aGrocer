import { NextResponse } from 'next/server';
import { z } from 'zod';
import { failed, notFound, parseJson } from '@/server/http';
import { trolleyAddResultSchema } from '@/shopping/schemas';
import { serverTrolleyJobRepository } from '@/server/repositories';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = await (await serverTrolleyJobRepository()).get(id);
    return job ? NextResponse.json(job) : notFound('Trolley job');
  } catch (error) { return failed(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await parseJson(request, z.union([
      z.object({ action: z.literal('start') }),
      z.object({ results: z.array(trolleyAddResultSchema).min(1).max(100) }),
    ]));
    if (!body.ok) return body.response;
    const repository = await serverTrolleyJobRepository();
    const job = 'action' in body.data ? await repository.markProcessing(id) : await repository.complete(id, body.data.results);
    return job ? NextResponse.json(job) : notFound('Pending trolley job');
  } catch (error) { return failed(error); }
}
