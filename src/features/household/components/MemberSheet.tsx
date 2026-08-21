'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2Icon } from 'lucide-react';
import {
  householdMemberDraftSchema,
  MEMBER_COLOURS,
  MEMBER_ROLES,
  type HouseholdMember,
  type HouseholdMemberDraft,
} from '@/domain/schemas/household';
import { initialsOf } from '@/domain/services/household';
import { BottomSheet } from '@/components/agrocer/BottomSheet';
import { FormChipSelect, FormTextField } from '@/components/agrocer/form/FormFields';
import { cn } from '@/lib/utils';

const emptyValues: HouseholdMemberDraft = { name: '', role: 'Child', colour: 'bg-moss-600' };

const COLOUR_NAMES: Record<(typeof MEMBER_COLOURS)[number], string> = {
  'bg-moss-600': 'Moss',
  'bg-moss-400': 'Sage',
  'bg-clay-500': 'Clay',
  'bg-honey-500': 'Honey',
  'bg-berry-500': 'Berry',
};

interface MemberSheetProps {
  open: boolean;
  onClose: () => void;
  member: HouseholdMember | null;
  onSave: (draft: HouseholdMemberDraft) => void;
  onDelete?: () => void;
}

export function MemberSheet({ open, onClose, member, onSave, onDelete }: MemberSheetProps) {
  const form = useForm<HouseholdMemberDraft>({
    resolver: zodResolver(householdMemberDraftSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(member ? { name: member.name, role: member.role, colour: member.colour } : emptyValues);
  }, [open, member, form]);

  const name = form.watch('name');
  const colour = form.watch('colour');

  const submit = form.handleSubmit((values) => {
    onSave(values);
    onClose();
  });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={member ? 'Edit member' : 'Add household member'}
      description={member ? 'Update who this is.' : 'Everyone who eats here.'}
      footer={
        <div className="flex gap-2.5">
          {member && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              aria-label="Remove member"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line text-berry-500 transition-colors duration-150 ease-out hover:bg-berry-50"
            >
              <Trash2Icon className="h-[18px] w-[18px]" />
            </button>
          ) : null}
          <button
            type="submit"
            form="member-form"
            className="h-12 flex-1 rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700"
          >
            {member ? 'Save changes' : 'Add member'}
          </button>
        </div>
      }
    >
      <form id="member-form" onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-canvas p-3">
          <span
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white',
              colour,
            )}
          >
            {initialsOf(name || '?')}
          </span>
          <p className="text-sm text-muted">Initials are taken from the name automatically.</p>
        </div>

        <FormTextField control={form.control} name="name" label="Name" placeholder="e.g. Milla" />
        <FormChipSelect control={form.control} name="role" label="Role" options={MEMBER_ROLES} columns={2} />
        <FormChipSelect
          control={form.control}
          name="colour"
          label="Avatar colour"
          options={MEMBER_COLOURS}
          activeClassName={(option) => cn('text-white border-transparent', option)}
          renderLabel={(option) => COLOUR_NAMES[option]}
        />
      </form>
    </BottomSheet>
  );
}
