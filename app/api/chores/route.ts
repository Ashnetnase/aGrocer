import { NextResponse } from 'next/server';
import { choreDraftSchema } from '@/domain/schemas/chores';
import { serverRepositories } from '@/server/repositories';
import { failed, parseJson } from '@/server/http';

/** Household chores: `GET` the whole list, `POST` a new one. */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const chores = await (await serverRepositories()).chores.list();
    return NextResponse.json({ chores });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, choreDraftSchema);
    if (!body.ok) return body.response;

    const chore = await (await serverRepositories()).chores.create(body.data);
    return NextResponse.json({ chore }, { status: 201 });
  } catch (error) {
    return failed(error);
  }
}
