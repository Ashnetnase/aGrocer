'use client';

import { useAgrocer } from '@/providers/AgrocerProvider';
import { cn } from '@/lib/utils';
import { DashboardCard } from './DashboardCard';

/**
 * Cards whose services do not exist yet (Phases 11–13).
 *
 * "Ask AshHome" used to live here. It moved to `AskCard.tsx` when slice 8b made it real.
 *
 * They reserve the layout so the dashboard's shape is settled before the data arrives, and
 * every one of them is labelled as a placeholder. The mock content is deliberately generic —
 * inventing plausible school notices or chores for real children would be indistinguishable
 * from real information on a kitchen wall.
 *
 * The one real thing here is the family's own members, used by the Kids card, because those
 * already exist in the household repository. The card carries no explanatory prose: the
 * placeholder label below it already says what is missing, and on a wall display the space is
 * better spent on the children's names than on a note about future phases.
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

export function KidsCard() {
  // Gated like the other real-data cards: the demo household has children of its own, and
  // showing someone else's children's names on a family wall is worse than showing nothing.
  const { household, hydrated } = useAgrocer();
  const children = household.members.filter((member) => member.role === 'Child');

  return (
    <DashboardCard title="Kids / Today" placeholder="Phases 12–13">
      {!hydrated ? (
        <p className="py-6 text-base text-muted">Loading…</p>
      ) : children.length === 0 ? (
        <p className="py-6 text-base text-muted">No children in the household yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {children.map((child) => (
            <li
              key={child.id}
              className="flex items-center gap-2.5 rounded-2xl border border-line px-3 py-2"
            >
              <span
                aria-hidden
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white',
                  child.colour,
                )}
              >
                {child.initials}
              </span>
              <span className="text-base font-semibold text-ink">{child.name}</span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
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

export function ChoresCard() {
  return (
    <DashboardCard title="Chores" placeholder="Phase 12">
      <ul>
        <MockRow label="Example: rubbish out" detail="Unassigned" />
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
