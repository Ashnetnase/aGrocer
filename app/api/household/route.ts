import { NextResponse } from 'next/server';
import { settingsSchema } from '@/domain/schemas/household';
import { serverRepositories } from '@/server/repositories';
import { failed, parseJson } from '@/server/http';

/**
 * The household: `GET` returns settings and members together, `PATCH` edits the settings.
 *
 * Members are a sub-collection at `household/members` rather than part of this body. The
 * contract treats them as one aggregate, but they change for different reasons — settings on
 * the Settings screen, members on the Household screen.
 */

export const dynamic = 'force-dynamic';

const settingsPatchSchema = settingsSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, 'Patch must change something');

export async function GET() {
  try {
    const household = await (await serverRepositories()).household.get();
    return NextResponse.json({ household });
  } catch (error) {
    return failed(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await parseJson(request, settingsPatchSchema);
    if (!body.ok) return body.response;

    const settings = await (await serverRepositories()).household.updateSettings(body.data);
    return NextResponse.json({ settings });
  } catch (error) {
    return failed(error);
  }
}
