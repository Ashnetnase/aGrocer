'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SchoolNotification } from '@/domain/schemas/school';
import { childName, visibleNotifications } from '@/domain/services/school';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { cn } from '@/lib/utils';
import { DashboardCard } from './DashboardCard';

/**
 * The Kids/School card, real as of Phase 12: the household's own children plus whatever
 * notices have been logged (hand-entered today; Hero email ingestion lands in Phase 13
 * without this card changing — it reads the same `school.list()`).
 *
 * Notifications are fetched here rather than in `AgrocerProvider`'s initial load, matching
 * order history and meal feedback — shared history, read on demand, not blocking first paint.
 */
export function KidsCard() {
  const { household, hydrated, listSchoolNotifications } = useAgrocer();
  const [notifications, setNotifications] = useState<SchoolNotification[]>([]);
  const children = household.members.filter((member) => member.role === 'Child');

  useEffect(() => {
    void listSchoolNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [listSchoolNotifications]);

  const visible = visibleNotifications(notifications);
  const unread = visible.filter((n) => !n.read).length;

  return (
    <DashboardCard
      title="Kids / School"
      meta={hydrated && unread > 0 ? `${unread} unread` : undefined}
      action={
        <Link
          href="/kids"
          className="rounded-full bg-moss-50 px-4 py-2 text-sm font-bold text-moss-700 transition-colors hover:bg-moss-100"
        >
          Open Kids
        </Link>
      }
    >
      {!hydrated ? (
        <p className="py-6 text-base text-muted">Loading…</p>
      ) : children.length === 0 ? (
        <p className="py-6 text-base text-muted">No children in the household yet.</p>
      ) : (
        <>
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
          {visible.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {visible.slice(0, 3).map((notification) => (
                <li key={notification.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {notification.title}
                    {childName(household.members, notification.childId)
                      ? ` · ${childName(household.members, notification.childId)}`
                      : ''}
                  </span>
                  {notification.actionRequired ? (
                    <span className="shrink-0 rounded-full bg-clay-50 px-2 py-0.5 text-xs font-bold text-clay-600">
                      Action
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </DashboardCard>
  );
}
