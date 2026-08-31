'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, ChevronRightIcon, HistoryIcon, LayoutDashboardIcon, LinkIcon, MailIcon, RotateCcwIcon, UsersIcon } from 'lucide-react';
import { settingsSchema, type Settings } from '@/domain/schemas/household';
import { describeHousehold } from '@/domain/services/household';
import { summariseCommonOrder } from '@/domain/services/orderHistory';
import type { OrderLineItem } from '@/domain/schemas/orderHistory';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { usesServerData } from '@/data/api/repositories';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import {
  FormNumberField,
  FormTextField,
  FormToggleCard,
} from '@/components/agrocer/form/FormFields';
import { BottomSheet } from '@/components/agrocer/BottomSheet';
import { SignOutButton } from '@/features/auth/SignOutButton';
import { OrderImportSheet } from './components/OrderImportSheet';

export function SettingsScreen() {
  const { household, updateSettings, resetDemoData, listOrderHistory, importOrderHistory, matchOrderHistory } = useAgrocer();
  const [confirmReset, setConfirmReset] = useState(false);
  // Read once: it is a build-time constant, not something that changes while the app runs.
  const serverData = usesServerData();
  const [saved, setSaved] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [orderHistory, setOrderHistory] = useState<OrderLineItem[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchMessage, setMatchMessage] = useState<string>();
  const [emailing, setEmailing] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string>();

  const sendWeeklyEmail = async () => {
    setEmailing(true);
    setEmailMessage(undefined);
    try {
      const response = await fetch('/api/email/weekly', { method: 'POST' });
      const body = (await response.json().catch(() => null)) as { sentTo?: string; error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? 'Could not send that email.');
      setEmailMessage(`Sent to ${body?.sentTo}.`);
    } catch (error) {
      setEmailMessage(error instanceof Error ? error.message : 'Could not send that email.');
    } finally {
      setEmailing(false);
    }
  };

  const refreshOrderHistory = () => {
    if (!serverData) return;
    void listOrderHistory().then(setOrderHistory).catch(() => setOrderHistory([]));
  };

  useEffect(() => {
    refreshOrderHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverData]);

  const commonOrder = summariseCommonOrder(orderHistory, { limit: 10 });
  const matchedCount = orderHistory.filter((line) => line.matchedProductId).length;

  const runMatch = async () => {
    setMatching(true);
    setMatchMessage(undefined);
    try {
      const { matched, total } = await matchOrderHistory();
      setMatchMessage(
        total === 0
          ? 'Everything already had a match.'
          : `Matched ${matched} of ${total} unmatched product${total === 1 ? '' : 's'} to the New World catalogue.`,
      );
      refreshOrderHistory();
    } catch {
      setMatchMessage('Could not match to the catalogue. Check the connection and try again.');
    } finally {
      setMatching(false);
    }
  };

  const form = useForm<Settings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: household.settings,
  });

  // Settings arrive from localStorage after mount, so re-seed the form once.
  useEffect(() => {
    form.reset(household.settings);
  }, [household.settings, form]);

  const submit = form.handleSubmit(async (values) => {
    await updateSettings(values);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  });

  const pinDemoDate = form.watch('pinDemoDate');

  return (
    <>
      <ScreenHeader title="Settings" subtitle="How Agrocer behaves for your household" />

      <main className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-4">
        <Link
          href="/household"
          className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 transition-colors duration-150 ease-out hover:border-moss-200"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-moss-50 text-moss-700">
            <UsersIcon className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">Household</span>
            <span className="block truncate text-xs text-muted">
              {household.settings.householdName} · {describeHousehold(household.members)}
            </span>
          </span>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
        </Link>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <FormTextField
            control={form.control}
            name="householdName"
            label="Household name"
            placeholder="e.g. The Ashfords"
          />
          <FormTextField
            control={form.control}
            name="shopLabel"
            label="Usual shop"
            placeholder="e.g. New World Thursday"
          />
          <FormNumberField
            control={form.control}
            name="weeklyBudget"
            label="Weekly grocery budget (NZD)"
            placeholder="e.g. 250"
            emptyValue={null}
            description="Optional. Agrocer compares the current shopping-list estimate with this target."
          />

          <FormToggleCard
            control={form.control}
            name="showBreakfastAndLunch"
            label="Show breakfast and lunch"
            description="Open the weekly planner with every meal slot"
            activeClassName="border-moss-300 bg-moss-50"
          />

          <FormToggleCard
            control={form.control}
            name="pinDemoDate"
            label="Pin the planner to a fixed date"
            description="For demos and screenshots. Off means the planner follows today."
            activeClassName="border-moss-300 bg-moss-50"
          />

          {pinDemoDate ? (
            <FormTextField
              control={form.control}
              name="pinnedDate"
              label="Pinned date"
              placeholder="yyyy-mm-dd"
            />
          ) : null}

          <button
            type="submit"
            className="h-12 w-full rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700"
          >
            {saved ? 'Saved' : 'Save settings'}
          </button>
        </form>

        {/*
          The way in to the wall dashboard.

          It lives in Settings rather than the bottom nav because it is an interface *mode*
          (`CLAUDE.md`: mobile, standard app, wall dashboard), not a peer of Pantry and
          Shopping — and because the person who needs it is setting up a tablet, which is
          when you open Settings. Until this existed the only route in was typing the URL,
          while the dashboard had linked back to the app all along.
        */}
        <section aria-labelledby="modes" className="mt-8">
          <h2
            id="modes"
            className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted"
          >
            Wall dashboard
          </h2>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-sm leading-relaxed text-muted">
              A full-screen view built for a tablet on the kitchen wall: today&rsquo;s shopping,
              tonight&rsquo;s meal and the family assistant, readable from across the room.
              Same data as here.
            </p>
            <Link
              href="/dashboard"
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-[13.5px] font-bold text-ink transition-colors duration-150 ease-out hover:bg-line"
            >
              <LayoutDashboardIcon className="h-4 w-4" /> Open the wall dashboard
            </Link>
          </div>
        </section>

        {/*
          Order history feeds a "common order" and, later, reorder prediction and AI meal
          suggestions — but it needs the shared database, exactly like meal feedback, so it is
          hidden rather than shown failing when the app is running on device-only storage.
        */}
        {serverData ? (
          <section aria-labelledby="order-history" className="mt-8">
            <h2
              id="order-history"
              className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted"
            >
              Order history
            </h2>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-sm leading-relaxed text-muted">
                Paste past New World order confirmations so Agrocer can learn what your household
                usually buys. Only product lines are read — never your name, address or phone
                number.
              </p>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-[13.5px] font-bold text-ink transition-colors duration-150 ease-out hover:bg-line"
              >
                <HistoryIcon className="h-4 w-4" /> Import a past order
              </button>

              {orderHistory.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void runMatch()}
                  disabled={matching}
                  className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-[13.5px] font-bold text-ink transition-colors duration-150 ease-out hover:bg-line disabled:opacity-50"
                >
                  <LinkIcon className="h-4 w-4" /> {matching ? 'Matching…' : 'Match to New World catalogue'}
                </button>
              ) : null}
              {matchMessage ? <p className="mt-2 text-xs text-muted" role="status">{matchMessage}</p> : null}

              {commonOrder.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">
                    Your common order, from {orderHistory.length} imported item{orderHistory.length === 1 ? '' : 's'}
                    {matchedCount > 0 ? ` · ${matchedCount} matched to a product` : ''}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {commonOrder.map((entry) => (
                      <li
                        key={entry.name}
                        className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 flex-1 truncate text-ink">
                          {entry.name}
                          {entry.matchedProductId ? <CheckIcon className="ml-1.5 inline h-3.5 w-3.5 text-moss-600" aria-label="Matched to a New World product" /> : null}
                        </span>
                        <span className="shrink-0 text-xs text-muted">
                          {entry.timesOrdered}× · last {entry.lastOrderedOn}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/*
          Manual, self-addressed only, on purpose. Pressing this button is the confirmation
          this project's rules require before anything leaves the household — no recipient
          field, no schedule. The email content is assembled from real data in code
          (`buildWeeklyDigest`), never written freehand by a model.
        */}
        {serverData ? (
          <section aria-labelledby="email" className="mt-8">
            <h2 id="email" className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              Email
            </h2>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-sm leading-relaxed text-muted">
                Send this week&rsquo;s meal plan and shopping list to your own email address.
              </p>
              <button
                type="button"
                onClick={() => void sendWeeklyEmail()}
                disabled={emailing}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-[13.5px] font-bold text-ink transition-colors duration-150 ease-out hover:bg-line disabled:opacity-50"
              >
                <MailIcon className="h-4 w-4" /> {emailing ? 'Sending…' : "Email me this week's plan"}
              </button>
              {emailMessage ? <p className="mt-2 text-xs text-muted" role="status">{emailMessage}</p> : null}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="data" className="mt-8">
          <h2 id="data" className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
            Data
          </h2>
          {/*
            Both halves of this section were wrong once the backend landed.

            The text said nothing left the phone, which stopped being true the day the app
            started reading Postgres — a false privacy claim is worse than none. And the reset
            button called `reset()`, which the server repositories refuse by design, so it
            surfaced an error rather than doing anything. Re-seeding a shared database is
            `npm run db:seed`, deliberately not something a screen can trigger.
          */}
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-sm leading-relaxed text-muted">
              {serverData
                ? 'Your pantry, list, planner and household are stored in the household database, so every device in the family sees the same thing. Only signed-in members of this household can read it.'
                : 'Agrocer is storing your pantry, list, planner and household on this device only. Nothing is shared with other devices until the household database is switched on.'}
            </p>
            {serverData ? null : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-[13.5px] font-bold text-berry-600 transition-colors duration-150 ease-out hover:bg-berry-50"
              >
                <RotateCcwIcon className="h-4 w-4" /> Reset to demo data
              </button>
            )}
          </div>
        </section>

        <section aria-labelledby="account" className="mt-8">
          <h2
            id="account"
            className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted"
          >
            Account
          </h2>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-sm leading-relaxed text-muted">
              Signing out returns this device to the sign-in screen. On the kitchen wall tablet
              you will normally want to stay signed in.
            </p>
            <SignOutButton />
          </div>
        </section>
      </main>

      <OrderImportSheet
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={async (drafts) => {
          await importOrderHistory(drafts);
          refreshOrderHistory();
        }}
      />

      <BottomSheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset to demo data?"
        description="This clears everything saved on this device and restores the sample household."
        footer={
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="h-12 flex-1 rounded-2xl border border-line bg-canvas text-[15px] font-bold text-ink transition-colors duration-150 ease-out hover:bg-line"
            >
              Keep my data
            </button>
            <button
              type="button"
              onClick={() => {
                void resetDemoData();
                setConfirmReset(false);
              }}
              className="h-12 flex-1 rounded-2xl bg-berry-500 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-berry-600"
            >
              Reset
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          Your pantry, shopping list, meal plan, products and household members will all go back to the
          sample data Agrocer ships with. This cannot be undone.
        </p>
      </BottomSheet>
    </>
  );
}
