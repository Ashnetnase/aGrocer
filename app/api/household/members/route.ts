import { NextResponse } from 'next/server';
import { householdMemberDraftSchema } from '@/domain/schemas/household';
import { serverRepositories } from '@/server/repositories';
import { failed, parseJson } from '@/server/http';

/**
 * Household members. `POST` adds one; the list itself comes back with `GET /api/household`,
 * since no screen needs members without the settings around them.
 *
 * Initials are derived server-side by the repository, not accepted from the client — they are
 * a function of the name, so letting a caller set them separately invites drift.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, householdMemberDraftSchema);
    if (!body.ok) return body.response;

    const member = await (await serverRepositories()).household.addMember(body.data);
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return failed(error);
  }
}
