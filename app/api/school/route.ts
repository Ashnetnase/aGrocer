import { NextResponse } from 'next/server';
import { schoolNotificationDraftSchema } from '@/domain/schemas/school';
import { serverRepositories } from '@/server/repositories';
import { failed, parseJson } from '@/server/http';

/**
 * Kids/School notifications (Phase 12).
 *
 * `GET` the household's notifications (read and dismissed included — the Kids screen filters);
 * `POST` one notification, either hand-entered or from the Hero-email ingestion pipeline
 * (Phase 13). There is no `DELETE`: a wrong notification is dismissed, not erased, matching
 * the append-and-review shape in `SchoolRepository`.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const notifications = await (await serverRepositories()).school.list();
    return NextResponse.json({ notifications });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, schoolNotificationDraftSchema);
    if (!body.ok) return body.response;

    const notification = await (await serverRepositories()).school.add(body.data);
    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    return failed(error);
  }
}
