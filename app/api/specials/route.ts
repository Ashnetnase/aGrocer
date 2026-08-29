import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSpecialsProvider } from '@/specials/provider';
import { serverRepositories } from '@/server/repositories';
import { failed, parseJson } from '@/server/http';

export const dynamic = 'force-dynamic';

const querySchema = z.object({ query: z.string().trim().min(2).max(80) });

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, querySchema);
    if (!body.ok) return body.response;
    await serverRepositories();
    const offers = await getSpecialsProvider().search(body.data.query);
    return NextResponse.json({ offers });
  } catch (error) {
    return failed(error);
  }
}
