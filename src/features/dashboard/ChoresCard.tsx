'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckIcon } from 'lucide-react';
import type { Chore } from '@/domain/schemas/chores';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { cn } from '@/lib/utils';
import { DashboardCard } from './DashboardCard';

/** Real as of Phase 12: touch-complete a chore straight from the wall, same as Shopping. */
export function ChoresCard() {
  const { household, hydrated, listChores, toggleChore } = useAgrocer();
  const [chores, setChores] = useState<Chore[]>([]);

  useEffect(() => {
    void listChores()
      .then(setChores)
      .catch(() => setChores([]));
  }, [listChores]);

  const outstanding = chores.filter((chore) => !chore.done);
  const memberName = (id: string | null) => (id ? household.members.find((m) => m.id === id)?.name : null);

  const handleToggle = async (chore: Chore) => {
    await toggleChore(chore.id);
    setChores((current) => current.map((c) => (c.id === chore.id ? { ...c, done: true } : c)));
  };

  return (
    <DashboardCard
      title="Chores"
      meta={hydrated && outstanding.length > 0 ? `${outstanding.length} outstanding` : undefined}
      action={
        <Link
          href="/chores"
          className="rounded-full bg-moss-50 px-4 py-2 text-sm font-bold text-moss-700 transition-colors hover:bg-moss-100"
        >
          Open Chores
        </Link>
      }
    >
      {!hydrated ? (
        <p className="py-6 text-base text-muted">Loading…</p>
      ) : outstanding.length === 0 ? (
        <p className="py-6 text-base text-muted">Nothing outstanding.</p>
      ) : (
        <ul className="space-y-1.5">
          {outstanding.slice(0, 5).map((chore) => (
            <li key={chore.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={false}
                aria-label={`Mark ${chore.title} as done`}
                onClick={() => void handleToggle(chore)}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-line bg-canvas text-transparent transition-colors duration-150 ease-out hover:border-moss-300',
                )}
              >
                <CheckIcon className="h-4 w-4" strokeWidth={3} />
              </button>
              <span className="min-w-0 flex-1 truncate text-base font-semibold text-ink">{chore.title}</span>
              <span className="shrink-0 text-sm text-muted">{memberName(chore.assignedMemberId) ?? 'Unassigned'}</span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
