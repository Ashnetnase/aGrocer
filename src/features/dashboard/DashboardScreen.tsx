'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { useToday } from '@/providers/useToday';
import { ShoppingCard } from './ShoppingCard';
import { TonightCard } from './TonightCard';
import { AskCard, ChoresCard, KidsCard, RemindersCard, ScheduleCard } from './PlaceholderCards';

/**
 * The wall dashboard (Phase 1).
 *
 * One application, not a separate tablet app: every card reads the same repositories as the
 * phone views, so checking an item off here and checking it off on a phone are the same write.
 *
 * Layout follows the information hierarchy — urgent family actions and today's schedule first,
 * then shopping and tonight's meal, then the rest. Cards are sized for a 10–11" tablet read
 * from a few metres away, and the grid collapses to one column so the route is still usable on
 * a phone or laptop.
 *
 * From 1024px the page itself never scrolls: the grid fills the viewport, rows share the height
 * the rows are proportioned so the shopping row — the one the family actually touches — gets
 * roughly twice the height of the placeholder rows, and any card with more content than fits
 * scrolls inside its own frame. A wall display that needs scrolling to be read is not
 * glanceable, and nobody is standing there to scroll it.
 *
 * The placeholder rows are deliberately shallow. They exist to reserve the layout, and giving
 * mock chores more of the wall than the real shopping list would be the wrong shape to settle
 * into before the real services arrive.
 */

const timeFormatter = new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit' });
const dateFormatter = new Intl.DateTimeFormat('en-NZ', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function Clock() {
  const today = useToday();
  const [now, setNow] = useState(today);

  useEffect(() => {
    // Ticks on the minute boundary rather than every 60s from mount, so the displayed time
    // never lags the wall clock by up to a minute on a screen that stays open for weeks.
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const next = 60_000 - (Date.now() % 60_000);
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, next);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <p className="text-4xl font-extrabold leading-none tracking-tight text-ink">
        {timeFormatter.format(now)}
      </p>
      <p className="mt-1 text-base font-semibold text-muted">{dateFormatter.format(now)}</p>
    </div>
  );
}

export function DashboardScreen() {
  const { household } = useAgrocer();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-5 py-5 lg:h-dvh lg:overflow-hidden">
      <header className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-4">
        <Clock />
        <div className="text-right">
          <p className="text-xl font-extrabold tracking-tight text-ink">
            {household.settings.householdName}
          </p>
          <Link
            href="/"
            className="mt-1 inline-block text-base font-semibold text-moss-700 hover:underline"
          >
            Open Agrocer
          </Link>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <KidsCard />
        <ScheduleCard />
        <RemindersCard />
        {/* Shopping earns the widest cell: it is the card the family actually touches. */}
        <ShoppingCard className="lg:col-span-2" />
        <TonightCard />
        <ChoresCard />
        <AskCard className="lg:col-span-2" />
      </div>
    </div>
  );
}
