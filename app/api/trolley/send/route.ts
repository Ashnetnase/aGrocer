import { NextResponse } from 'next/server';
import { failed, parseJson } from '@/server/http';
import { serverRepositories } from '@/server/repositories';
import { NewWorldCompanionClient } from '@/shopping/companion';
import { trolleyAddBatchSchema } from '@/shopping/schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, trolleyAddBatchSchema);
    if (!body.ok) return body.response;
    await serverRepositories();
    const results = await new NewWorldCompanionClient().addBatch(body.data.items);
    return NextResponse.json({
      results,
      summary: {
        requested: results.length,
        added: results.filter((result) => result.status === 'added').length,
        attention: results.filter((result) => result.status !== 'added').length,
      },
      checkout: 'manual',
    });
  } catch (error) {
    return failed(error);
  }
}
