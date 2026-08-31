import { NextResponse } from 'next/server';
import { buildWeeklyDigest } from '@/domain/services/weeklyDigest';
import { currentUser } from '@/auth/server';
import { serverRepositories } from '@/server/repositories';
import { getEmailProvider } from '@/email/provider';
import { EmailError } from '@/email/types';
import { failed } from '@/server/http';

/**
 * Emails the signed-in person their own weekly meal plan and shopping list (AshHome, Stage 5).
 *
 * Deliberately manual and self-addressed only: pressing the button in Settings *is* the
 * confirmation this project's rules require before anything leaves the household — there is no
 * recipient field, no scheduling, and no AI writes the content (see `buildWeeklyDigest`). Sending
 * to anyone other than the person who asked, or on any kind of schedule, is a different feature
 * with a different risk profile and would need its own explicit decision.
 */

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await currentUser();
    if (!user?.email) return NextResponse.json({ error: 'Sign in to continue' }, { status: 401 });

    const repos = await serverRepositories();
    const [plan, meals, shopping, household] = await Promise.all([
      repos.meals.getPlan(),
      repos.meals.list(),
      repos.shopping.list(),
      repos.household.get(),
    ]);

    const digest = buildWeeklyDigest(plan, meals, shopping, household.settings.weeklyBudget);
    await getEmailProvider().send({ to: user.email, subject: digest.subject, text: digest.text });

    return NextResponse.json({ sentTo: user.email });
  } catch (error) {
    if (error instanceof EmailError) {
      console.error('[api/email/weekly]', error.kind, error.message);
      return NextResponse.json({ error: error.publicMessage }, { status: error.kind === 'config' ? 503 : 502 });
    }
    return failed(error);
  }
}
