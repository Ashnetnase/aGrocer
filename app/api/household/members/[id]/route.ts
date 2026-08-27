import { NextResponse } from 'next/server';
import { householdMemberDraftSchema } from '@/domain/schemas/household';
import { serverRepositories } from '@/server/repositories';
import { failed, notFound, parseJson } from '@/server/http';

/**
 * One member: `PUT` to replace, `DELETE` to remove.
 *
 * `PUT` because the contract takes a whole draft — the member form edits name, role and
 * colour together, and initials are re-derived from the name on every write.
 */

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const body = await parseJson(request, householdMemberDraftSchema);
    if (!body.ok) return body.response;

    const member = await serverRepositories().household.updateMember(id, body.data);
    return member ? NextResponse.json({ member }) : notFound('Member');
  } catch (error) {
    return failed(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    await serverRepositories().household.removeMember(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return failed(error);
  }
}
