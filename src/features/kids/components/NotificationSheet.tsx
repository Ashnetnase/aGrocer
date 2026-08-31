'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { HouseholdMember } from '@/domain/schemas/household';
import { schoolNotificationActionTypeSchema, type SchoolNotificationDraft } from '@/domain/schemas/school';
import { toIsoDate } from '@/domain/services/dates';
import { BottomSheet } from '@/components/agrocer/BottomSheet';
import { FormChipSelect, FormTextareaField, FormTextField, FormToggleCard } from '@/components/agrocer/form/FormFields';

/**
 * Hand-entering a notice — permission slip, term-date reminder, whatever showed up in the
 * post or on the school app. Not a Hero feature: this is the manual `SchoolProvider`, useful
 * on its own, and the same `add()` a future Hero-email pipeline will call into (Phase 13).
 */

const formSchema = z.object({
  childId: z.string(),
  title: z.string().trim().min(1, 'Required').max(200),
  summary: z.string().trim().max(2000),
  eventDate: z.string(),
  dueDate: z.string(),
  actionRequired: z.boolean(),
  actionType: z.union([schoolNotificationActionTypeSchema, z.literal('')]),
  sourceLink: z.string().trim().max(500),
});

type FormValues = z.infer<typeof formSchema>;

const NO_CHILD = '';

const emptyValues: FormValues = {
  childId: NO_CHILD,
  title: '',
  summary: '',
  eventDate: '',
  dueDate: '',
  actionRequired: false,
  actionType: '',
  sourceLink: '',
};

interface NotificationSheetProps {
  open: boolean;
  onClose: () => void;
  childMembers: HouseholdMember[];
  onSave: (draft: SchoolNotificationDraft) => void;
}

export function NotificationSheet({ open, onClose, childMembers, onSave }: NotificationSheetProps) {
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (open) form.reset(emptyValues);
  }, [open, form]);

  const actionRequired = form.watch('actionRequired');

  const submit = form.handleSubmit((values) => {
    onSave({
      childId: values.childId || null,
      provider: 'manual',
      needsReview: false,
      externalReference: null,
      title: values.title,
      summary: values.summary,
      eventDate: values.eventDate || null,
      dueDate: values.dueDate || null,
      actionRequired: values.actionRequired,
      actionType: values.actionType || null,
      sourceLink: values.sourceLink || null,
      receivedAt: toIsoDate(new Date()),
    });
    onClose();
  });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Log a school notice"
      description="Permission slips, term dates, anything worth remembering."
      footer={
        <button
          type="submit"
          form="notification-form"
          className="h-12 w-full rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700"
        >
          Save
        </button>
      }
    >
      <form id="notification-form" onSubmit={submit} className="space-y-4">
        <FormTextField control={form.control} name="title" label="Title" placeholder="e.g. Sports day permission" />
        <FormTextareaField control={form.control} name="summary" label="Details" placeholder="Optional" />

        {childMembers.length > 0 ? (
          <FormChipSelect
            control={form.control}
            name="childId"
            label="Which child"
            options={[NO_CHILD, ...childMembers.map((child) => child.id)]}
            renderLabel={(id) => (id === NO_CHILD ? 'Not specific' : (childMembers.find((c) => c.id === id)?.name ?? id))}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="notification-event-date" className="mb-1.5 block text-sm font-semibold text-ink">
              Event date
            </label>
            <input
              id="notification-event-date"
              type="date"
              {...form.register('eventDate')}
              className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[15px] text-ink focus:border-moss-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-moss-100"
            />
          </div>
          <div>
            <label htmlFor="notification-due-date" className="mb-1.5 block text-sm font-semibold text-ink">
              Reply due
            </label>
            <input
              id="notification-due-date"
              type="date"
              {...form.register('dueDate')}
              className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[15px] text-ink focus:border-moss-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-moss-100"
            />
          </div>
        </div>

        <FormToggleCard
          control={form.control}
          name="actionRequired"
          label="Needs a response"
          description="Shows at the top of the Kids card until it's dealt with."
        />

        {actionRequired ? (
          <FormChipSelect
            control={form.control}
            name="actionType"
            label="What kind"
            options={['permission', 'payment', 'rsvp', 'reminder', 'info'] as const}
            columns={3}
          />
        ) : null}

        <FormTextField control={form.control} name="sourceLink" label="Link back (optional)" placeholder="https://…" />
      </form>
    </BottomSheet>
  );
}
