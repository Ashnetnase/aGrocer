'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2Icon } from 'lucide-react';
import { nameSchema } from '@/domain/schemas/common';
import type { Chore, ChoreDraft } from '@/domain/schemas/chores';
import type { HouseholdMember } from '@/domain/schemas/household';
import { BottomSheet } from '@/components/agrocer/BottomSheet';
import { FormChipSelect, FormTextField } from '@/components/agrocer/form/FormFields';

const NO_ONE = '';

/** `assignedMemberId` is `''` in the form (so a chip option can represent "unassigned") and
 * converted to `null` only at submit — the same pattern `NotificationSheet` uses for `childId`. */
const formSchema = z.object({ title: nameSchema, assignedMemberId: z.string() });
type FormValues = z.infer<typeof formSchema>;

const emptyValues: FormValues = { title: '', assignedMemberId: NO_ONE };

interface ChoreSheetProps {
  open: boolean;
  onClose: () => void;
  chore: Chore | null;
  members: HouseholdMember[];
  onSave: (draft: ChoreDraft) => void;
  onDelete?: () => void;
}

export function ChoreSheet({ open, onClose, chore, members, onSave, onDelete }: ChoreSheetProps) {
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    form.reset(
      chore ? { title: chore.title, assignedMemberId: chore.assignedMemberId ?? NO_ONE } : emptyValues,
    );
  }, [open, chore, form]);

  const submit = form.handleSubmit((values) => {
    const draft: ChoreDraft = { title: values.title, assignedMemberId: values.assignedMemberId || null };
    onSave(draft);
    onClose();
  });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={chore ? 'Edit chore' : 'Add a chore'}
      description={chore ? 'Update this chore.' : 'Something that needs doing around the house.'}
      footer={
        <div className="flex gap-2.5">
          {chore && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              aria-label="Remove chore"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line text-berry-500 transition-colors duration-150 ease-out hover:bg-berry-50"
            >
              <Trash2Icon className="h-[18px] w-[18px]" />
            </button>
          ) : null}
          <button
            type="submit"
            form="chore-form"
            className="h-12 flex-1 rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700"
          >
            {chore ? 'Save changes' : 'Add chore'}
          </button>
        </div>
      }
    >
      <form id="chore-form" onSubmit={submit} className="space-y-4">
        <FormTextField control={form.control} name="title" label="What needs doing" placeholder="e.g. Take the rubbish out" />
        {members.length > 0 ? (
          <FormChipSelect
            control={form.control}
            name="assignedMemberId"
            label="Who's doing it"
            options={[NO_ONE, ...members.map((member) => member.id)]}
            renderLabel={(id) => (id === NO_ONE ? 'Unassigned' : (members.find((m) => m.id === id)?.name ?? id))}
          />
        ) : null}
      </form>
    </BottomSheet>
  );
}
