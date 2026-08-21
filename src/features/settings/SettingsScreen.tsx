'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRightIcon, RotateCcwIcon, UsersIcon } from 'lucide-react';
import { settingsSchema, type Settings } from '@/domain/schemas/household';
import { describeHousehold } from '@/domain/services/household';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { FormTextField, FormToggleCard } from '@/components/agrocer/form/FormFields';
import { BottomSheet } from '@/components/agrocer/BottomSheet';

export function SettingsScreen() {
  const { household, updateSettings, resetDemoData } = useAgrocer();
  const [confirmReset, setConfirmReset] = useState(false);
  const [saved, setSaved] = useState(false);

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

        <section aria-labelledby="data" className="mt-8">
          <h2 id="data" className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
            Data
          </h2>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-sm leading-relaxed text-muted">
              Agrocer stores your pantry, list, planner and household on this device. Nothing leaves your
              phone until the Agrocer backend arrives.
            </p>
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-[13.5px] font-bold text-berry-600 transition-colors duration-150 ease-out hover:bg-berry-50"
            >
              <RotateCcwIcon className="h-4 w-4" /> Reset to demo data
            </button>
          </div>
        </section>
      </main>

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
