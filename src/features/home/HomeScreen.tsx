'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRightIcon,
  BellIcon,
  CalendarPlusIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  ClockIcon,
  GraduationCapIcon,
  PlusIcon,
  ShoppingCartIcon,
  UsersIcon,
} from 'lucide-react';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { usePlannerWeek } from '@/providers/useToday';
import { rotateToToday } from '@/domain/services/dates';
import { findMeal, mealFor, pantryItemToShoppingDraft } from '@/domain/services/meals';
import { needsAttention, describeStock } from '@/domain/services/pantry';
import { isOnList, summariseShopping } from '@/domain/services/shopping';
import { childName, visibleNotifications } from '@/domain/services/school';
import type { SchoolNotification } from '@/domain/schemas/school';
import type { Chore } from '@/domain/schemas/chores';
import { StockChip } from '@/components/agrocer/StockChip';
import { MealImage } from '@/components/agrocer/MealImage';
import { nzd } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Glanceable Kids/School updates on the phone, not just the wall (2026-08-31): the same
 * `school.list()` and `visibleNotifications()` ordering the dashboard's `KidsCard` uses, so
 * "check the tablet" was never the only way to see what needs a reply. Fetched on mount, same
 * reasoning as the dashboard card — shared history, not part of the app's initial load.
 */
function KidsAndSchoolGlance() {
  const { household, listSchoolNotifications } = useAgrocer();
  const [notifications, setNotifications] = useState<SchoolNotification[]>([]);
  const children = household.members.filter((member) => member.role === 'Child');

  useEffect(() => {
    void listSchoolNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [listSchoolNotifications]);

  if (children.length === 0) return null;

  const visible = visibleNotifications(notifications);
  const unread = visible.filter((notification) => !notification.read).length;
  const topThree = visible.slice(0, 3);

  return (
    <section aria-labelledby="kids-school" className="mt-5">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 id="kids-school" className="text-base font-bold tracking-tight text-ink">
          Kids &amp; School
        </h2>
        <Link href="/kids" className="text-xs font-semibold text-moss-700">
          Open Kids
        </Link>
      </div>
      <Link
        href="/kids"
        className="block w-full rounded-3xl border border-line bg-surface p-4 text-left shadow-card transition-colors duration-150 ease-out hover:border-moss-200"
      >
        {topThree.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <GraduationCapIcon className="h-4 w-4" /> No notices right now.
          </p>
        ) : (
          <ul className="space-y-2">
            {topThree.map((notification) => (
              <li key={notification.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink">{notification.title}</p>
                  <p className="truncate text-xs text-muted">
                    {childName(household.members, notification.childId) ?? 'Family'}
                    {notification.dueDate ? ` · Due ${notification.dueDate}` : ''}
                  </p>
                </div>
                {notification.actionRequired ? (
                  <span className="shrink-0 rounded-full bg-clay-50 px-2 py-0.5 text-[11px] font-bold text-clay-600">
                    Action
                  </span>
                ) : !notification.read ? (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-moss-600" aria-label="Unread" />
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {unread > 0 ? (
          <p className="mt-3 border-t border-line pt-2 text-xs font-semibold text-moss-700">
            {unread} unread
          </p>
        ) : null}
      </Link>
    </section>
  );
}

/** Same reasoning as `KidsAndSchoolGlance`: touch a chore off from the phone, not just the wall. */
function ChoresGlance() {
  const { household, listChores, toggleChore } = useAgrocer();
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
    <section aria-labelledby="chores" className="mt-6">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 id="chores" className="text-base font-bold tracking-tight text-ink">
          Chores
        </h2>
        <Link href="/chores" className="text-xs font-semibold text-moss-700">
          Open Chores
        </Link>
      </div>
      {outstanding.length === 0 ? (
        <p className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
          <ClipboardListIcon className="h-4 w-4" /> Nothing outstanding.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {outstanding.slice(0, 4).map((chore) => (
            <li key={chore.id} className="flex items-center gap-3 bg-surface px-4 py-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={false}
                aria-label={`Mark ${chore.title} as done`}
                onClick={() => void handleToggle(chore)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-line bg-canvas text-transparent transition-colors duration-150 ease-out hover:border-moss-300"
              >
                <CheckIcon className="h-4 w-4" strokeWidth={3} />
              </button>
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{chore.title}</span>
              <span className="shrink-0 text-xs text-muted">{memberName(chore.assignedMemberId) ?? 'Unassigned'}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const QUICK_ACTIONS = [
  { label: 'Add pantry', icon: PlusIcon, href: '/pantry?add=1' },
  { label: 'Add to shop', icon: ShoppingCartIcon, href: '/shopping?add=1' },
  { label: 'Plan a meal', icon: CalendarPlusIcon, href: '/meals?add=1' },
] as const;

export function HomeScreen() {
  const router = useRouter();
  const { pantry, shopping, plan, meals, products, household, addShoppingItem } = useAgrocer();
  const week = usePlannerWeek();

  const tonight = findMeal(meals, mealFor(plan, week.todayKey, 'dinner'));
  const alerts = pantry.filter(needsAttention);
  const { remaining, total, progress } = summariseShopping(shopping);
  const orderedDays = rotateToToday(week.days, week.todayKey);

  return (
    <>
      <header className="shrink-0 bg-canvas px-5 pb-2 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-moss-600 text-base font-extrabold text-white">
              a
            </span>
            <div>
              {/* The app name is this screen's h1: Home has no ScreenHeader, so
                  without it the page would start at h2. */}
              <h1 className="text-[19px] font-extrabold leading-none tracking-tight text-ink">Agrocer</h1>
              <p className="mt-1 text-[11px] font-medium text-muted">Meals, pantry and groceries</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => router.push('/notifications')}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors duration-150 ease-out hover:bg-moss-50"
          >
            <BellIcon className="h-[18px] w-[18px]" />
            {alerts.length > 0 ? <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-clay-500" /> : null}
          </button>
        </div>
      </header>

      <main className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-3">
        <div className="flex items-center justify-between rounded-2xl border border-line bg-surface px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2">
              {household.members.map((member) => (
                <span
                  key={member.id}
                  title={`${member.name} · ${member.role}`}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface text-[11px] font-bold text-white',
                    member.colour,
                  )}
                >
                  {member.initials}
                </span>
              ))}
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-ink">{household.settings.householdName}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                <UsersIcon className="h-3 w-3" /> {household.members.length} in the house
              </p>
            </div>
          </div>
          <Link href="/household" className="text-xs font-semibold text-moss-700">
            Manage
          </Link>
        </div>

        <KidsAndSchoolGlance />

        <section aria-labelledby="tonight" className="mt-5">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 id="tonight" className="text-base font-bold tracking-tight text-ink">
              Tonight’s dinner
            </h2>
            <span className="text-xs font-medium text-muted">{week.todayLabel}</span>
          </div>
          {tonight ? (
            <Link
              href="/meals"
              className="group relative block w-full overflow-hidden rounded-3xl text-left shadow-card"
            >
              <MealImage
                src={tonight.image}
                width={440}
                height={192}
                priority
                className="h-48 w-full"
                iconClassName="h-12 w-12"
              />
              <div className="absolute inset-0 bg-ink/45" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="flex flex-wrap gap-1.5">
                  {tonight.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-white">{tonight.name}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[13px] font-medium text-white/85">
                  <span className="flex items-center gap-1">
                    <ClockIcon className="h-3.5 w-3.5" /> {tonight.minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <UsersIcon className="h-3.5 w-3.5" /> Serves {tonight.serves}
                  </span>
                </div>
              </div>
              <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink">
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            </Link>
          ) : (
            <Link
              href="/meals?add=1"
              className="flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-line bg-surface/70 py-10 text-sm font-semibold text-moss-700"
            >
              <CalendarPlusIcon className="h-4 w-4" /> Nothing planned — pick tonight’s meal
            </Link>
          )}
        </section>

        <section aria-label="Quick actions" className="mt-5 grid grid-cols-3 gap-2.5">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-start gap-2 rounded-2xl border border-line bg-surface p-3 text-left transition-colors duration-150 ease-out hover:border-moss-200 hover:bg-moss-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-moss-50 text-moss-700">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[12.5px] font-semibold leading-tight text-ink">{action.label}</span>
              </Link>
            );
          })}
        </section>

        <section aria-labelledby="alerts" className="mt-6">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 id="alerts" className="text-base font-bold tracking-tight text-ink">
              Pantry alerts
            </h2>
            <Link href="/pantry" className="text-xs font-semibold text-moss-700">
              View pantry
            </Link>
          </div>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {alerts.slice(0, 4).map((item) => {
              const alreadyListed = isOnList(shopping, item.name);
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">{item.name}</p>
                    <p className="truncate text-xs text-muted">{describeStock(item)}</p>
                  </div>
                  <StockChip state={item.state} size="sm" />
                  <button
                    type="button"
                    disabled={alreadyListed}
                    onClick={() => void addShoppingItem(pantryItemToShoppingDraft(item, products))}
                    aria-label={`Add ${item.name} to shopping list`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss-50 text-moss-700 transition-colors duration-150 ease-out hover:bg-moss-100 disabled:bg-canvas disabled:text-muted"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            {alerts.length > 4 ? (
              <Link
                href="/pantry?filter=attention"
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-moss-700"
              >
                {alerts.length - 4} more running low
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="shopping-summary" className="mt-6">
          <h2 id="shopping-summary" className="sr-only">
            Shopping list summary
          </h2>
          <Link
            href="/shopping"
            className="block w-full rounded-3xl border border-line bg-surface p-4 text-left shadow-card transition-colors duration-150 ease-out hover:border-moss-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted">Shopping list</p>
                <p className="mt-0.5 text-[22px] font-extrabold leading-tight tracking-tight text-ink">
                  {remaining.length} items to buy
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-muted">Estimated</p>
                <p className="mt-0.5 text-[22px] font-extrabold leading-tight tracking-tight text-moss-700">
                  {nzd(total)}
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-moss-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">
              {shopping.length - remaining.length} of {shopping.length} already in the trolley
            </p>
          </Link>
        </section>

        <section aria-labelledby="week" className="mt-6">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 id="week" className="text-base font-bold tracking-tight text-ink">
              This week
            </h2>
            <Link href="/meals" className="text-xs font-semibold text-moss-700">
              Open planner
            </Link>
          </div>
          <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
            {orderedDays.map((day) => {
              const meal = findMeal(meals, mealFor(plan, day.key, 'dinner'));
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => router.push('/meals')}
                  className={cn(
                    'w-[132px] shrink-0 overflow-hidden rounded-2xl border text-left transition-colors duration-150 ease-out',
                    day.isToday ? 'border-moss-300 bg-moss-50' : 'border-line bg-surface',
                  )}
                >
                  {meal ? (
                    <MealImage src={meal.image} width={132} height={64} className="h-16 w-full" />
                  ) : (
                    <div className="flex h-16 w-full items-center justify-center bg-canvas text-muted">
                      <CalendarPlusIcon className="h-4 w-4" />
                    </div>
                  )}
                  <div className="p-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                      {day.isToday ? 'Tonight' : day.short}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-ink">
                      {meal ? meal.name : 'Not planned'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <ChoresGlance />
      </main>
    </>
  );
}
