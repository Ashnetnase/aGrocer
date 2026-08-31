'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, ClipboardListIcon, Trash2Icon } from 'lucide-react';
import type { Chore, ChoreDraft } from '@/domain/schemas/chores';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { EmptyState } from '@/components/agrocer/EmptyState';
import { FloatingAddButton } from '@/components/agrocer/FloatingAddButton';
import { cn } from '@/lib/utils';
import { ChoreSheet } from './components/ChoreSheet';

/**
 * Household chores (Phase 12). Loaded on demand, the same shape as `KidsScreen`'s notices —
 * shared, cross-device state, not part of the app's initial load.
 */
export function ChoresScreen() {
  const { household, addChore, updateChore, toggleChore, removeChore, clearCompletedChores, listChores } =
    useAgrocer();
  const [chores, setChores] = useState<Chore[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Chore | null>(null);

  useEffect(() => {
    void listChores()
      .then(setChores)
      .catch(() => setChores([]))
      .finally(() => setLoaded(true));
  }, [listChores]);

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const handleSave = async (draft: ChoreDraft) => {
    if (editing) {
      await updateChore(editing.id, draft);
      setChores((current) => current.map((c) => (c.id === editing.id ? { ...c, ...draft } : c)));
    } else {
      const chore = await addChore(draft);
      setChores((current) => [chore, ...current]);
    }
  };

  const handleToggle = async (chore: Chore) => {
    await toggleChore(chore.id);
    setChores((current) => current.map((c) => (c.id === chore.id ? { ...c, done: !c.done } : c)));
  };

  const handleDelete = async (chore: Chore) => {
    await removeChore(chore.id);
    setChores((current) => current.filter((c) => c.id !== chore.id));
  };

  const handleClearCompleted = async () => {
    await clearCompletedChores();
    setChores((current) => current.filter((c) => !c.done));
  };

  const outstanding = chores.filter((chore) => !chore.done);
  const completed = chores.filter((chore) => chore.done);
  const memberName = (id: string | null) => (id ? household.members.find((m) => m.id === id)?.name : null);

  return (
    <>
      <ScreenHeader
        title="Chores"
        subtitle={chores.length ? `${outstanding.length} outstanding` : undefined}
      />

      <main className="no-scrollbar relative flex-1 overflow-y-auto px-5 pb-24 pt-4">
        {!loaded ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : chores.length === 0 ? (
          <EmptyState
            icon={ClipboardListIcon}
            title="No chores yet"
            body="Add the things that need doing around the house — the rubbish, the dishes, whatever it is."
            actionLabel="Add a chore"
            onAction={openAdd}
          />
        ) : (
          <>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {outstanding.map((chore) => (
                <li key={chore.id} className="flex items-center gap-3 bg-surface px-4 py-3.5">
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
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(chore);
                      setSheetOpen(true);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[15px] font-semibold text-ink">{chore.title}</p>
                    <p className="truncate text-xs text-muted">{memberName(chore.assignedMemberId) ?? 'Unassigned'}</p>
                  </button>
                </li>
              ))}
            </ul>

            {completed.length > 0 ? (
              <div className="mt-6">
                <div className="mb-2.5 flex items-baseline justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Done</h2>
                  <button
                    type="button"
                    onClick={() => void handleClearCompleted()}
                    className="flex items-center gap-1 text-xs font-semibold text-moss-700"
                  >
                    <Trash2Icon className="h-3 w-3" /> Clear done
                  </button>
                </div>
                <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line opacity-70">
                  {completed.map((chore) => (
                    <li key={chore.id} className="flex items-center gap-3 bg-surface px-4 py-3.5">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={true}
                        aria-label={`Mark ${chore.title} as not done`}
                        onClick={() => void handleToggle(chore)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-moss-600 bg-moss-600 text-white transition-colors duration-150 ease-out"
                      >
                        <CheckIcon className="h-4 w-4" strokeWidth={3} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={cn('truncate text-[15px] font-semibold text-muted line-through')}>
                          {chore.title}
                        </p>
                        <p className="truncate text-xs text-muted">{memberName(chore.assignedMemberId) ?? 'Unassigned'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDelete(chore)}
                        aria-label={`Remove ${chore.title}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-canvas"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </main>

      <FloatingAddButton label="Add a chore" onClick={openAdd} />

      <ChoreSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        chore={editing}
        members={household.members}
        onSave={(draft) => void handleSave(draft)}
        onDelete={editing ? () => void handleDelete(editing) : undefined}
      />
    </>
  );
}
