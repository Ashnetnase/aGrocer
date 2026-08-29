'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBasketIcon } from 'lucide-react';
import type { ShoppingItem, ShoppingItemDraft } from '@/domain/schemas/shopping';
import { groupByCategory, summariseShopping, summariseShoppingBudget } from '@/domain/services/shopping';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { EmptyState } from '@/components/agrocer/EmptyState';
import { FloatingAddButton } from '@/components/agrocer/FloatingAddButton';
import { ShoppingRow } from './components/ShoppingRow';
import { ShoppingItemSheet } from './components/ShoppingItemSheet';
import { nzd } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PreparedTrolley, TrolleyLine } from '@/shopping/types';
import type { RetailerProduct, TrolleyAddResult } from '@/shopping/schemas';
import { extensionEventSchema, pingNewWorldExtension, sendBatchToNewWorldExtension } from '@/shopping/extensionBridge';

export function ShoppingScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shopping, household, toggleShoppingItem, addShoppingItem, updateShoppingItem, removeShoppingItem, clearChecked } = useAgrocer();
  const [sheetOpen, setSheetOpen] = useState(searchParams.get('add') === '1');
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [trolley, setTrolley] = useState<PreparedTrolley | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<TrolleyAddResult[] | null>(null);
  const [trolleyError, setTrolleyError] = useState<string | null>(null);
  const [extensionOnline, setExtensionOnline] = useState(false);

  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const parsed = extensionEventSchema.safeParse(event.data);
      if (!parsed.success) return;
      if (parsed.data.type === 'AGROCER_NEW_WORLD_READY') setExtensionOnline(true);
      if (parsed.data.type === 'AGROCER_NEW_WORLD_RESULTS') { setSendResults(parsed.data.results); setSending(false); }
      if (parsed.data.type === 'AGROCER_NEW_WORLD_ERROR') { setTrolleyError(parsed.data.message); setSending(false); }
    };
    window.addEventListener('message', receive);
    pingNewWorldExtension();
    return () => window.removeEventListener('message', receive);
  }, []);

  const { remaining, checked, total, progress } = useMemo(() => summariseShopping(shopping), [shopping]);
  const budget = summariseShoppingBudget(total, household.settings.weeklyBudget);
  const groups = useMemo(() => groupByCategory(shopping), [shopping]);
  const openAdd = () => { setEditing(null); setSheetOpen(true); };
  const handleSave = (draft: ShoppingItemDraft) => editing ? void updateShoppingItem(editing.id, draft) : void addShoppingItem(draft);

  const prepareNewWorld = async () => {
    setPreparing(true); setTrolleyError(null);
    try {
      const response = await fetch('/api/trolley/prepare', { method: 'POST' });
      if (!response.ok) throw new Error('prepare failed');
      setTrolley((await response.json()) as PreparedTrolley);
      setSendResults(null);
    } catch { setTrolleyError('Could not prepare the New World trolley. Please retry.'); }
    finally { setPreparing(false); }
  };

  const chooseProduct = async (line: TrolleyLine, product: RetailerProduct) => {
    const response = await fetch('/api/trolley/preferences', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shoppingItemKey: line.requestedText, product, defaultQuantity: line.requestedQuantity }),
    });
    if (!response.ok) { setTrolleyError('Could not remember that product.'); return; }
    await prepareNewWorld();
  };

  const sendToNewWorld = async () => {
    if (!trolley) return;
    const items = trolley.lines.filter((line) => line.status === 'ready' && line.product).map((line) => ({
      shoppingItemId: line.shoppingItem.id,
      ...(line.product?.productUrl ? { productUrl: line.product.productUrl } : {}),
      ...(line.product?.externalProductId ? { externalProductId: line.product.externalProductId } : {}),
      expectedName: line.product?.name ?? line.requestedText,
      quantity: line.requestedQuantity,
    }));
    setSending(true); setTrolleyError(null);
    if (extensionOnline) {
      try { sendBatchToNewWorldExtension(items); }
      catch { setTrolleyError('The prepared products were not valid for the browser extension.'); setSending(false); }
      return;
    }
    try {
      const response = await fetch('/api/trolley/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }) });
      if (!response.ok) throw new Error('send failed');
      setSendResults(((await response.json()) as { results: TrolleyAddResult[] }).results);
    } catch { setTrolleyError('The companion could not add products. Check that it is running and retry.'); }
    finally { setSending(false); }
  };

  return <>
    <ScreenHeader title="Shopping" subtitle={`${remaining.length} to buy · ${household.settings.shopLabel}`}>
      <div className="rounded-3xl border border-line bg-surface p-4 shadow-card">
        <div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-muted">In the trolley</p><p className="mt-0.5 text-[22px] font-extrabold text-ink">{checked.length} of {shopping.length}</p></div><div className="text-right"><p className="text-sm font-semibold text-muted">Estimated total</p><p className="mt-0.5 text-[22px] font-extrabold text-moss-700">{nzd(total)}</p></div></div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-moss-500" style={{ width: `${progress}%` }} /></div>
        {budget ? <div className="mt-3 rounded-2xl bg-canvas px-3 py-2.5"><div className="flex justify-between gap-3 text-sm font-semibold"><span className="text-muted">Weekly budget {nzd(budget.target)}</span><span className={budget.over ? 'text-berry-600' : 'text-moss-700'}>{budget.over ? `${nzd(Math.abs(budget.remaining))} over` : `${nzd(budget.remaining)} left`}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className={cn('h-full rounded-full', budget.over ? 'bg-berry-500' : 'bg-moss-500')} style={{ width: `${budget.progress}%` }} /></div></div> : null}
        <button type="button" onClick={() => router.push('/shopping/mode')} disabled={!shopping.length} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-moss-600 text-[15px] font-bold text-white disabled:bg-line disabled:text-muted"><ShoppingBasketIcon className="h-[18px] w-[18px]" /> Start shopping mode</button>
        <button type="button" onClick={() => void prepareNewWorld()} disabled={!shopping.length || preparing} className="mt-2 flex h-11 w-full items-center justify-center rounded-2xl border border-moss-200 bg-white text-sm font-bold text-moss-700 disabled:opacity-50">{preparing ? 'Preparing…' : 'Prepare New World trolley'}</button>
      </div>
    </ScreenHeader>

    <main className="no-scrollbar relative flex-1 overflow-y-auto px-5 pb-24 pt-4">
      {trolleyError ? <p className="mb-3 rounded-2xl bg-berry-50 px-4 py-3 text-sm font-semibold text-berry-700">{trolleyError}</p> : null}
      {trolley ? <section className="mb-5 rounded-2xl border border-moss-200 bg-moss-50 p-4" aria-label="New World trolley review">
        <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-ink">New World trolley</h2><p className="text-xs text-muted">{trolley.summary.total} items · {trolley.summary.ready} ready · {trolley.summary.needsReview} need review · {trolley.summary.unavailable} unavailable</p></div><button type="button" className="text-xs font-bold text-muted" onClick={() => setTrolley(null)}>Close</button></div>
        <div className="mt-3 space-y-2">
          {extensionOnline ? <div className="rounded-xl bg-moss-100 px-3 py-2 text-sm text-moss-800"><strong>Chrome trolley extension ready</strong><p className="text-xs">Products will be added in your normal visible New World tab.</p></div> : !trolley.companion.online ? <div className="rounded-xl bg-honey-50 px-3 py-2 text-sm text-ink"><strong>Trolley companion offline</strong><p className="text-xs text-muted">Install the Chrome extension or start the local companion to add products.</p></div> : null}
          {trolley.lines.map((line) => <div key={line.shoppingItem.id} className="rounded-xl bg-white px-3 py-2 text-sm">
            <div className="flex justify-between gap-3"><span>{line.requestedQuantity} {line.shoppingItem.unit} {line.requestedText}</span><span className={line.status === 'ready' ? 'text-moss-700' : 'text-berry-600'}>{line.status === 'ready' ? 'Ready' : line.status === 'unavailable' ? 'Unavailable' : 'Needs review'}</span></div>
            {line.product ? <p className="mt-1 text-xs text-muted">{line.product.name}{line.product.size ? ` · ${line.product.size}` : ''}{line.product.price !== undefined ? ` · ${nzd(line.product.price)}` : ''}<br />{line.source === 'household-preference' ? 'Matched from household preference' : `Match confidence ${Math.round(line.confidence * 100)}%`}</p> : <p className="mt-1 text-xs text-muted">{line.reason}</p>}
            {line.requiresReview && line.candidates?.length ? <div className="mt-2 space-y-1">{line.candidates.map((candidate) => <button key={candidate.externalProductId ?? candidate.productUrl ?? candidate.name} type="button" onClick={() => void chooseProduct(line, candidate)} className="block w-full rounded-lg border border-line px-2 py-2 text-left text-xs font-semibold text-ink">Choose {candidate.name}{candidate.size ? ` · ${candidate.size}` : ''}</button>)}</div> : null}
          </div>)}
        </div>
        {sendResults ? <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm"><strong>{sendResults.filter((result) => result.status === 'added').length} / {sendResults.length} added</strong><p className="text-xs text-muted">{sendResults.some((result) => result.status !== 'added') ? 'Some products require your attention.' : 'Your trolley is ready for review.'}</p></div> : null}
        <button type="button" disabled={(!extensionOnline && !trolley.companion.online) || !trolley.summary.ready || sending} onClick={() => void sendToNewWorld()} className="mt-3 h-11 w-full rounded-2xl bg-moss-600 text-sm font-bold text-white disabled:bg-line disabled:text-muted">{sending ? 'Adding products…' : `Add ${trolley.summary.ready} ready items to New World`}</button>
        <p className="mt-2 text-center text-xs text-muted">Agrocer prepares the trolley. You complete checkout and payment in New World.</p>
      </section> : null}

      {!shopping.length ? <EmptyState icon={ShoppingBasketIcon} title="Nothing on the list" body="Add what the family needs, or pull staples straight from your Products list." actionLabel="Add an item" onAction={openAdd} /> : <div className="space-y-5">{groups.map((group) => <section key={group.category} aria-label={group.category}><h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted">{group.category}</h2><div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">{group.items.map((item) => <ShoppingRow key={item.id} item={item} shoppingMode={false} onToggle={() => void toggleShoppingItem(item.id)} onEdit={() => { setEditing(item); setSheetOpen(true); }} />)}</div></section>)}</div>}
      {checked.length ? <button type="button" onClick={() => void clearChecked()} className="mt-5 w-full rounded-2xl border border-line bg-surface py-3 text-sm font-semibold text-muted">Clear {checked.length} bought items</button> : null}
    </main>
    <FloatingAddButton label="Add shopping item" onClick={openAdd} />
    <ShoppingItemSheet open={sheetOpen} onClose={() => setSheetOpen(false)} item={editing} onSave={handleSave} onDelete={editing ? () => void removeShoppingItem(editing.id) : undefined} />
  </>;
}
