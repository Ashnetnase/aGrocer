'use client';

import { cn } from '@/lib/utils';
import { DashboardCard } from './DashboardCard';

/**
 * Cards whose services do not exist yet — just Reminders now (Phase 11).
 *
 * "Ask AshHome" moved to `AskCard.tsx`, Kids to `KidsCard.tsx`, Chores to `ChoresCard.tsx`, and
 * the family schedule to `ScheduleCard.tsx` (a read-only iCloud calendar feed) as each phase
 * made them real — every one lives on its own now that it fetches real data rather than
 * reading only what `AgrocerProvider` already holds.
 *
 * This file reserves the layout so the dashboard's shape is settled before the data arrives,
 * and the remaining placeholder is labelled as one. The mock content is deliberately generic —
 * inventing a plausible reminder would be indistinguishable from a real one on a kitchen wall.
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

export function RemindersCard() {
  return (
    <DashboardCard title="Reminders" placeholder="Phase 11">
      <ul>
        <MockRow label="Example: overdue reminder" detail="Overdue" tone="urgent" />
      </ul>
    </DashboardCard>
  );
}
