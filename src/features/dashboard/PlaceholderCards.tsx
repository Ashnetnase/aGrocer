'use client';

import { cn } from '@/lib/utils';
import { DashboardCard } from './DashboardCard';

/**
 * Cards whose services do not exist yet (Phase 11 — reminders — and Phase 12's family calendar).
 *
 * "Ask AshHome" moved to `AskCard.tsx` when slice 8b made it real. The Kids card moved to
 * `KidsCard.tsx`, and the Chores card to `ChoresCard.tsx`, when Phase 12 made each of them
 * real — both live on their own now that they fetch real data rather than reading only what
 * `AgrocerProvider` already holds.
 *
 * They reserve the layout so the dashboard's shape is settled before the data arrives, and
 * every one of them is labelled as a placeholder. The mock content is deliberately generic —
 * inventing a plausible family schedule would be indistinguishable from real information on a
 * kitchen wall.
 */

function MockRow({ label, detail, tone }: { label: string; detail: string; tone?: 'urgent' }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <span className="text-lg font-semibold text-ink">{label}</span>
      <span
        className={cn(
          'shrink-0 text-sm font-bold',
          tone === 'urgent' ? 'text-clay-600' : 'text-muted',
        )}
      >
        {detail}
      </span>
    </li>
  );
}

export function ScheduleCard() {
  return (
    <DashboardCard title="Family schedule" meta="Today" placeholder="Phase 12">
      <ul>
        <MockRow label="Example: swimming" detail="4:00 pm" />
      </ul>
    </DashboardCard>
  );
}

export function RemindersCard() {
  return (
    <DashboardCard title="Reminders" placeholder="Phase 11">
      <ul>
        <MockRow label="Example: overdue reminder" detail="Overdue" tone="urgent" />
      </ul>
    </DashboardCard>
  );
}
