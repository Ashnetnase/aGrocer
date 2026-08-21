'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SettingsIcon, UserPlusIcon, UsersIcon } from 'lucide-react';
import type { HouseholdMember, HouseholdMemberDraft } from '@/domain/schemas/household';
import { describeHousehold } from '@/domain/services/household';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { EmptyState } from '@/components/agrocer/EmptyState';
import { FloatingAddButton } from '@/components/agrocer/FloatingAddButton';
import { MemberSheet } from './components/MemberSheet';
import { cn } from '@/lib/utils';

export function HouseholdScreen() {
  const { household, addMember, updateMember, removeMember } = useAgrocer();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<HouseholdMember | null>(null);

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const handleSave = (draft: HouseholdMemberDraft) => {
    if (editing) void updateMember(editing.id, draft);
    else void addMember(draft);
  };

  return (
    <>
      <ScreenHeader
        title="Household"
        subtitle={`${household.settings.householdName} · ${describeHousehold(household.members)}`}
        action={
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors duration-150 ease-out hover:bg-moss-50"
          >
            <SettingsIcon className="h-[18px] w-[18px]" />
          </Link>
        }
      />

      <main className="no-scrollbar relative flex-1 overflow-y-auto px-5 pb-24 pt-4">
        {household.members.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No one here yet"
            body="Add the people who eat at your place so meals and portions make sense."
            actionLabel="Add a member"
            onAction={openAdd}
          />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {household.members.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(member);
                    setSheetOpen(true);
                  }}
                  className="flex w-full items-center gap-3 bg-surface px-4 py-3.5 text-left transition-colors duration-150 ease-out hover:bg-canvas"
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
                      member.colour,
                    )}
                  >
                    {member.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">{member.name}</span>
                    <span className="block text-xs text-muted">{member.role}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <UserPlusIcon className="h-4 w-4 text-moss-600" /> Sharing
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Everyone currently shares one list on this device. Accounts and real-time sharing across phones
            arrive with the Agrocer backend.
          </p>
        </div>
      </main>

      <FloatingAddButton label="Add household member" onClick={openAdd} />

      <MemberSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        member={editing}
        onSave={handleSave}
        onDelete={editing ? () => void removeMember(editing.id) : undefined}
      />
    </>
  );
}
