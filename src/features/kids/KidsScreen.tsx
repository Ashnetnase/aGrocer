'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BellIcon, CheckIcon, SettingsIcon, XIcon } from 'lucide-react';
import type { SchoolNotification, SchoolNotificationDraft } from '@/domain/schemas/school';
import { childName, visibleNotifications } from '@/domain/services/school';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { EmptyState } from '@/components/agrocer/EmptyState';
import { FloatingAddButton } from '@/components/agrocer/FloatingAddButton';
import { cn } from '@/lib/utils';
import { NotificationSheet } from './components/NotificationSheet';

/**
 * Kids/School foundation (Phase 12): each child's profile and a hand-entered notice log.
 *
 * Notifications load on demand, the same shape `FeedbackRepository`/`OrderHistoryRepository`
 * use — this is shared, cross-device history, not part of the app's initial load. Hero email
 * ingestion (Phase 13) will write into the same list through the same `school.add()`; nothing
 * here changes when that lands, it just stops being the only way a notice gets in.
 */

const ACTION_LABELS: Record<NonNullable<SchoolNotification['actionType']>, string> = {
  permission: 'Permission',
  payment: 'Payment',
  rsvp: 'RSVP',
  reminder: 'Reminder',
  info: 'Info',
};

export function KidsScreen() {
  const { household, listSchoolNotifications, addSchoolNotification, markSchoolNotificationRead, dismissSchoolNotification } =
    useAgrocer();
  const [notifications, setNotifications] = useState<SchoolNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const children = household.members.filter((member) => member.role === 'Child');

  useEffect(() => {
    void listSchoolNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoaded(true));
  }, [listSchoolNotifications]);

  const visible = visibleNotifications(notifications);

  const handleSave = async (draft: SchoolNotificationDraft) => {
    const notification = await addSchoolNotification(draft);
    setNotifications((current) => [notification, ...current]);
  };

  const toggleRead = async (notification: SchoolNotification) => {
    await markSchoolNotificationRead(notification.id, !notification.read);
    setNotifications((current) =>
      current.map((n) => (n.id === notification.id ? { ...n, read: !notification.read } : n)),
    );
  };

  const dismiss = async (notification: SchoolNotification) => {
    await dismissSchoolNotification(notification.id);
    setNotifications((current) => current.map((n) => (n.id === notification.id ? { ...n, dismissed: true } : n)));
  };

  return (
    <>
      <ScreenHeader
        title="Kids & School"
        subtitle={children.length ? `${children.length} ${children.length === 1 ? 'child' : 'children'}` : undefined}
        action={
          <Link
            href="/household"
            aria-label="Household"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors duration-150 ease-out hover:bg-moss-50"
          >
            <SettingsIcon className="h-[18px] w-[18px]" />
          </Link>
        }
      />

      <main className="no-scrollbar relative flex-1 overflow-y-auto px-5 pb-24 pt-4">
        {children.length === 0 ? (
          <p className="text-sm text-muted">
            No children in the household yet. Add one from <Link href="/household" className="font-semibold text-moss-700">Household</Link>.
          </p>
        ) : (
          <ul className="mb-5 flex flex-wrap gap-3">
            {children.map((child) => (
              <li key={child.id} className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 py-2">
                <span
                  aria-hidden
                  className={cn('flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white', child.colour)}
                >
                  {child.initials}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{child.name}</span>
                  {child.school ? <span className="block text-xs text-muted">{child.school}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}

        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Notices</h2>

        {!loaded ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={BellIcon}
            title="No notices yet"
            body="Permission slips, term dates and school notes will show up here."
            actionLabel="Log a notice"
            onAction={() => setSheetOpen(true)}
          />
        ) : (
          <ul className="space-y-2.5">
            {visible.map((notification) => {
              const name = childName(household.members, notification.childId);
              return (
                <li key={notification.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn('text-[15px] font-semibold', notification.read ? 'text-ink' : 'text-ink')}>
                        {notification.title}
                        {!notification.read ? <span className="ml-2 inline-block h-2 w-2 rounded-full bg-moss-600" aria-label="Unread" /> : null}
                      </p>
                      {name ? <p className="text-xs text-muted">{name}</p> : null}
                      {notification.summary ? <p className="mt-1 text-sm text-muted">{notification.summary}</p> : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        {notification.actionType ? (
                          <span className="rounded-full bg-clay-50 px-2 py-0.5 font-bold text-clay-600">
                            {ACTION_LABELS[notification.actionType]}
                          </span>
                        ) : null}
                        {notification.eventDate ? <span>Event {notification.eventDate}</span> : null}
                        {notification.dueDate ? <span>Due {notification.dueDate}</span> : null}
                        {notification.sourceLink ? (
                          <a href={notification.sourceLink} target="_blank" rel="noreferrer" className="font-semibold text-moss-700">
                            Open source
                          </a>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => void toggleRead(notification)}
                        aria-label={notification.read ? 'Mark unread' : 'Mark read'}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-canvas"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void dismiss(notification)}
                        aria-label="Dismiss"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-canvas"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <FloatingAddButton label="Log a notice" onClick={() => setSheetOpen(true)} />

      <NotificationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        childMembers={children}
        onSave={(draft) => void handleSave(draft)}
      />
    </>
  );
}
