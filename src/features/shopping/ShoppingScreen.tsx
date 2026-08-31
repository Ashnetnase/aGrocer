'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { NewWorldCatalogue } from './components/NewWorldCatalogue';
import { CommonOrderQuickAdd } from './components/CommonOrderQuickAdd';
import { ProductThumbnail } from './components/ProductThumbnail';
import { nzd } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PreparedTrolley, TrolleyLine } from '@/shopping/types';
import type { RetailerProduct, RetailerProductSearchJob, TrolleyAddResult, TrolleyJob } from '@/shopping/schemas';
import { extensionEventSchema, pingNewWorldExtension, searchWithNewWorldExtension, sendBatchToNewWorldExtension } from '@/shopping/extensionBridge';

function withPreparedLines(trolley: PreparedTrolley, lines: TrolleyLine[]): PreparedTrolley {
  return {
    ...trolley,
    lines,
    summary: {
      total: lines.length,
      ready: lines.filter((line) => line.status === 'ready').length,
      needsReview: lines.filter((line) => line.status === 'needs-review').length,
      unavailable: lines.filter((line) => line.status === 'unavailable').length,
      estimatedTotal: lines.reduce((total, line) => total + (line.product?.specialPrice ?? line.product?.price ?? 0) * line.requestedQuantity, 0),
    },
  };
}

export function ShoppingScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shopping, household, products, toggleShoppingItem, addShoppingItem, updateShoppingItem, removeShoppingItem, clearChecked } = useAgrocer();
  const [sheetOpen, setSheetOpen] = useState(searchParams.get('add') === '1');
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [trolley, setTrolley] = useState<PreparedTrolley | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<TrolleyAddResult[] | null>(null);
  const [trolleyError, setTrolleyError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [extensionOnline, setExtensionOnline] = useState(false);
  const [extensionCandidates, setExtensionCandidates] = useState<Record<string, RetailerProduct[]>>({});
  const [extensionSearchMessages, setExtensionSearchMessages] = useState<Record<string, string>>({});
  const [searchingItemId, setSearchingItemId] = useState<string | null>(null);
  const searchTimeout = useRef<number | null>(null);
  const activeJobId = useRef<string | null>(null);
  const activeSearchJobId = useRef<string | null>(null);
  const activeJobItems = useRef<TrolleyJob['items']>([]);
  const [pendingJob, setPendingJob] = useState<TrolleyJob | null>(null);
  const [queuedJob, setQueuedJob] = useState<TrolleyJob | null>(null);
  const [pendingSearchJob, setPendingSearchJob] = useState<RetailerProductSearchJob | null>(null);
  const [queuedSearchJob, setQueuedSearchJob] = useState<RetailerProductSearchJob | null>(null);

  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const parsed = extensionEventSchema.safeParse(event.data);
      if (!parsed.success) return;
      if (parsed.data.type === 'AGROCER_NEW_WORLD_READY') setExtensionOnline(true);
      if (parsed.data.type === 'AGROCER_NEW_WORLD_RESULTS') {
        setSendResults(parsed.data.results);
        setSending(false);
        setActionMessage(parsed.data.results.every((result) => result.status === 'added') ? 'New World trolley update completed.' : 'Trolley processing finished with items that need attention.');
        if (activeJobId.current) {
          const jobId = activeJobId.current;
          activeJobId.current = null;
          activeJobItems.current = [];
          void fetch(`/api/trolley/jobs/${jobId}`, {
            method: 'PATCH', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ results: parsed.data.results }),
          }).then(async (response) => { if (response.ok) setQueuedJob((await response.json()) as TrolleyJob); });
        }
      }
      if (parsed.data.type === 'AGROCER_NEW_WORLD_SEARCH_RESULTS') {
        const search = parsed.data;
        if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
        setExtensionCandidates((current) => ({ ...current, [search.shoppingItemId]: search.products }));
        setExtensionSearchMessages((current) => ({ ...current, [search.shoppingItemId]: search.message ?? (search.products.length ? 'Choose the exact product below.' : 'No products found.') }));
        setSearchingItemId(null);
        if (search.products.length) {
          void fetch('/api/retailer/new-world/products', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ products: search.products }),
          }).catch(() => undefined);
        }
        if (activeSearchJobId.current) {
          const jobId = activeSearchJobId.current;
          activeSearchJobId.current = null;
          void fetch(`/api/trolley/search-jobs/${jobId}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ products: search.products, ...(search.message ? { message: search.message } : {}) }),
          }).then(async (response) => {
            if (response.ok) setQueuedSearchJob((await response.json()) as RetailerProductSearchJob);
          });
        }
      }
      if (parsed.data.type === 'AGROCER_NEW_WORLD_ERROR') {
        const errorMessage = parsed.data.message;
        if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
        setTrolleyError(parsed.data.message);
        setSearchingItemId(null);
        setSending(false);
        if (activeSearchJobId.current) {
          const jobId = activeSearchJobId.current;
          activeSearchJobId.current = null;
          void fetch(`/api/trolley/search-jobs/${jobId}`, {
            method: 'PATCH', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ products: [], message: errorMessage }),
          }).then(async (response) => {
            if (response.ok) setQueuedSearchJob((await response.json()) as RetailerProductSearchJob);
          });
        }
        if (activeJobId.current) {
          const jobId = activeJobId.current;
          const results: TrolleyAddResult[] = activeJobItems.current.map((item) => ({
            shoppingItemId: item.shoppingItemId,
            status: 'unknown-error',
            requestedQuantity: item.quantity,
            message: errorMessage,
          }));
          activeJobId.current = null;
          activeJobItems.current = [];
          if (results.length) void fetch(`/api/trolley/jobs/${jobId}`, {
            method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ results }),
          }).then(async (response) => { if (response.ok) setQueuedJob((await response.json()) as TrolleyJob); });
        }
      }
    };
    window.addEventListener('message', receive);
    pingNewWorldExtension();
    return () => {
      window.removeEventListener('message', receive);
      if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!extensionOnline) return;
    const refresh = () => void fetch('/api/trolley/jobs').then(async (response) => {
      if (!response.ok) return;
      const data = (await response.json()) as { jobs: TrolleyJob[] };
      setPendingJob(data.jobs[0] ?? null);
    });
    const refreshAll = () => {
      refresh();
      void fetch('/api/trolley/search-jobs').then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { jobs: RetailerProductSearchJob[] };
        setPendingSearchJob(data.jobs[0] ?? null);
      });
    };
    refreshAll();
    const timer = window.setInterval(refreshAll, 5_000);
    return () => window.clearInterval(timer);
  }, [extensionOnline]);

  useEffect(() => {
    if (!queuedJob || ['completed', 'attention', 'dismissed'].includes(queuedJob.status)) return;
    const timer = window.setInterval(() => {
      void fetch(`/api/trolley/jobs/${queuedJob.id}`).then(async (response) => {
        if (!response.ok) return;
        const job = (await response.json()) as TrolleyJob;
        setQueuedJob(job);
        if (job.results) setSendResults(job.results);
      });
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [queuedJob]);

  useEffect(() => {
    if (!queuedSearchJob || ['completed', 'attention', 'dismissed'].includes(queuedSearchJob.status)) return;
    const timer = window.setInterval(() => {
      void fetch(`/api/trolley/search-jobs/${queuedSearchJob.id}`).then(async (response) => {
        if (!response.ok) return;
        const job = (await response.json()) as RetailerProductSearchJob;
        setQueuedSearchJob(job);
        if (job.products) {
          setExtensionCandidates((current) => ({ ...current, [job.shoppingItemId]: job.products ?? [] }));
          setExtensionSearchMessages((current) => ({ ...current, [job.shoppingItemId]: job.message ?? (job.products?.length ? 'Choose the exact product below.' : 'No products found.') }));
        }
      });
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [queuedSearchJob]);

  const { remaining, checked, total, progress } = useMemo(() => summariseShopping(shopping), [shopping]);
  const budget = summariseShoppingBudget(total, household.settings.weeklyBudget);

  useEffect(() => {
    setTrolley((current) => {
      if (!current) return current;
      const stillUnchecked = new Set(remaining.map((item) => item.id));
      const lines = current.lines.filter((line) => stillUnchecked.has(line.shoppingItem.id));
      if (lines.length === current.lines.length) return current;
      if (!lines.length) return null;
      return withPreparedLines(current, lines);
    });
  }, [remaining]);

  const groups = useMemo(() => groupByCategory(shopping), [shopping]);
  const draftMatchId = editing?.id ?? '__draft__';
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
    setTrolleyError(null);
    const response = await fetch('/api/trolley/preferences', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shoppingItemKey: line.requestedText, product, defaultQuantity: line.requestedQuantity }),
    });
    if (!response.ok) { setTrolleyError('Could not remember that product.'); return; }
    setActionMessage(`${product.name} is now the saved New World product for ${line.requestedText}.`);
    await prepareNewWorld();
  };

  const togglePreference = async (line: TrolleyLine) => {
    const response = await fetch('/api/trolley/preferences', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shoppingItemKey: line.requestedText, enabled: !line.preferenceEnabled }),
    });
    if (!response.ok) { setTrolleyError('Could not update the saved product preference.'); return; }
    await prepareNewWorld();
  };

  const removePreparedLine = (shoppingItemId: string) => {
    setTrolley((current) => {
      if (!current) return null;
      const lines = current.lines.filter((line) => line.shoppingItem.id !== shoppingItemId);
      return lines.length ? withPreparedLines(current, lines) : null;
    });
    setSendResults((current) => current?.filter((result) => result.shoppingItemId !== shoppingItemId) ?? null);
    setActionMessage('Removed from this prepared trolley. Your shopping list is unchanged.');
  };

  const clearPreparedTrolley = () => {
    setTrolley(null);
    setSendResults(null);
    setSending(false);
    setActionMessage('Prepared New World trolley cleared. Your shopping list is unchanged.');
  };

  const queueDesktopProductSearch = async (item: Pick<ShoppingItem, 'id' | 'name'>, query: string) => {
    if (queuedSearchJob && ['pending', 'processing'].includes(queuedSearchJob.status)) {
      setExtensionSearchMessages((current) => ({ ...current, [item.id]: 'A live product search is already waiting for the desktop. Dismiss it before starting another.' }));
      return;
    }
    const response = await fetch('/api/trolley/search-jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shoppingItemId: item.id,
        shoppingItemKey: item.name,
        query,
      }),
    });
    if (!response.ok) throw new Error('queue failed');
    const job = (await response.json()) as RetailerProductSearchJob;
    setQueuedSearchJob(job);
    setExtensionSearchMessages((current) => ({
      ...current,
      [item.id]: 'Live search queued. Open Agrocer Shopping on the desktop and process the product search.',
    }));
    setActionMessage(`Live New World search for ${query} was sent to the desktop.`);
  };

  const searchNewWorldItem = async (item: Pick<ShoppingItem, 'id' | 'name'>, query: string) => {
    const trimmedQuery = query.trim() || item.name;
    setSearchingItemId(item.id);
    setExtensionCandidates((current) => ({ ...current, [item.id]: [] }));
    if (!extensionOnline) {
      setExtensionSearchMessages((current) => ({ ...current, [item.id]: 'Checking saved New World products…' }));
      try {
        const parameters = new URLSearchParams({ q: trimmedQuery, limit: '20' });
        const response = await fetch(`/api/retailer/new-world/products?${parameters}`);
        const body = (await response.json().catch(() => null)) as { products?: RetailerProduct[]; message?: string; source?: 'live' | 'cache' } | null;
        if (!response.ok || !body?.products) throw new Error('search failed');
        const products = body.products;
        setExtensionCandidates((current) => ({ ...current, [item.id]: products }));
        setExtensionSearchMessages((current) => ({
          ...current,
          [item.id]: body.message ?? (products.length ? 'Choose the exact product below.' : 'No products found.'),
        }));
        if (body.source !== 'live') await queueDesktopProductSearch(item, trimmedQuery);
      } catch {
        try { await queueDesktopProductSearch(item, trimmedQuery); }
        catch { setExtensionSearchMessages((current) => ({ ...current, [item.id]: 'Could not load saved products or queue a desktop search.' })); }
      } finally {
        setSearchingItemId(null);
      }
      return;
    }
    setExtensionSearchMessages((current) => ({ ...current, [item.id]: 'Searching in your New World tab…' }));
    searchWithNewWorldExtension(item.id, trimmedQuery);
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    searchTimeout.current = window.setTimeout(() => {
      setSearchingItemId(null);
      setExtensionSearchMessages((messages) => ({ ...messages, [item.id]: 'New World search timed out. Reload extension 0.1.6 and retry.' }));
    }, 60_000);
  };

  /** Lets a person give up on a slow live search instead of waiting out the full 60s timeout. */
  const cancelNewWorldSearch = (itemId: string) => {
    if (searchTimeout.current) { window.clearTimeout(searchTimeout.current); searchTimeout.current = null; }
    setSearchingItemId(null);
    setExtensionSearchMessages((messages) => ({ ...messages, [itemId]: 'Search cancelled.' }));
  };

  const searchNewWorld = (line: TrolleyLine) => searchNewWorldItem(line.shoppingItem, line.requestedText);

  const sendToNewWorld = async () => {
    if (!trolley) return;
    const items = trolley.lines.filter((line) => line.status === 'ready' && line.product).map((line) => ({
      shoppingItemId: line.shoppingItem.id,
      ...(line.product?.productUrl ? { productUrl: line.product.productUrl } : {}),
      ...(line.product?.externalProductId ? { externalProductId: line.product.externalProductId } : {}),
      expectedName: line.product?.name ?? line.requestedText,
      quantity: line.requestedQuantity,
    }));
    setSending(true); setTrolleyError(null); setActionMessage(null);
    if (extensionOnline) {
      try { sendBatchToNewWorldExtension(items); setActionMessage('Chrome is processing the trolley. Keep the New World tab open.'); }
      catch { setTrolleyError('The prepared products were not valid for the browser extension.'); setSending(false); }
      return;
    }
    if (!trolley.companion.online) {
      try {
        const response = await fetch('/api/trolley/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }) });
        if (!response.ok) throw new Error('queue failed');
        setQueuedJob((await response.json()) as TrolleyJob);
        setActionMessage('Trolley queued. Open Agrocer Shopping on the desktop and process the queued trolley.');
        setSending(false);
      } catch { setTrolleyError('Could not queue this trolley for the desktop.'); setSending(false); }
      return;
    }
    try {
      const response = await fetch('/api/trolley/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }) });
      if (!response.ok) throw new Error('send failed');
      setSendResults(((await response.json()) as { results: TrolleyAddResult[] }).results);
    } catch { setTrolleyError('The companion could not add products. Check that it is running and retry.'); }
    finally { setSending(false); }
  };

  const processPendingJob = async () => {
    if (!pendingJob) return;
    setSending(true); setTrolleyError(null);
    const response = await fetch(`/api/trolley/jobs/${pendingJob.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'start' }) });
    if (!response.ok) { setTrolleyError('That queued trolley is no longer pending.'); setSending(false); return; }
    const started = (await response.json()) as TrolleyJob;
    activeJobId.current = started.id;
    activeJobItems.current = started.items;
    setQueuedJob(started);
    setPendingJob(null);
    try { sendBatchToNewWorldExtension(started.items); }
    catch { setTrolleyError('The queued products were not valid for the extension.'); setSending(false); }
  };

  const processPendingSearchJob = async () => {
    if (!pendingSearchJob) return;
    setTrolleyError(null);
    setActionMessage(`Searching New World for ${pendingSearchJob.query}…`);
    const response = await fetch(`/api/trolley/search-jobs/${pendingSearchJob.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'start' }),
    });
    if (!response.ok) { setTrolleyError('That product search is no longer pending.'); return; }
    const started = (await response.json()) as RetailerProductSearchJob;
    activeSearchJobId.current = started.id;
    setQueuedSearchJob(started);
    setPendingSearchJob(null);
    setSearchingItemId(started.shoppingItemId);
    searchWithNewWorldExtension(started.shoppingItemId, started.query);
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    searchTimeout.current = window.setTimeout(() => {
      const jobId = activeSearchJobId.current;
      activeSearchJobId.current = null;
      setSearchingItemId(null);
      setExtensionSearchMessages((messages) => ({ ...messages, [started.shoppingItemId]: 'New World search timed out. Reload extension 0.1.6 and retry.' }));
      if (jobId) void fetch(`/api/trolley/search-jobs/${jobId}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ products: [], message: 'Desktop New World search timed out.' }),
      }).then(async (result) => { if (result.ok) setQueuedSearchJob((await result.json()) as RetailerProductSearchJob); });
    }, 60_000);
  };

  const dismissSearchActivity = async () => {
    const job = queuedSearchJob ?? pendingSearchJob;
    if (job) await fetch(`/api/trolley/search-jobs/${job.id}`, { method: 'DELETE' });
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    activeSearchJobId.current = null;
    setQueuedSearchJob(null);
    setPendingSearchJob(null);
    setSearchingItemId(null);
    setExtensionSearchMessages({});
    setExtensionCandidates({});
  };

  const dismissTrolleyActivity = async () => {
    const job = queuedJob ?? pendingJob;
    if (job) await fetch(`/api/trolley/jobs/${job.id}`, { method: 'DELETE' });
    activeJobId.current = null;
    activeJobItems.current = [];
    setQueuedJob(null);
    setPendingJob(null);
    setSendResults(null);
    setSending(false);
    setActionMessage(null);
  };

  return <>
    <ScreenHeader title="Shopping" subtitle={`${remaining.length} to buy · ${household.settings.shopLabel}`} />

    <main className="no-scrollbar relative flex-1 overflow-y-auto px-5 pb-24 pt-4">
      <div className="mb-4 rounded-3xl border border-line bg-surface p-4 shadow-card">
        <div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-muted">In the trolley</p><p className="mt-0.5 text-[22px] font-extrabold text-ink">{checked.length} of {shopping.length}</p></div><div className="text-right"><p className="text-sm font-semibold text-muted">Estimated total</p><p className="mt-0.5 text-[22px] font-extrabold text-moss-700">{nzd(total)}</p></div></div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-moss-500" style={{ width: `${progress}%` }} /></div>
        {budget ? <div className="mt-3 rounded-2xl bg-canvas px-3 py-2.5"><div className="flex justify-between gap-3 text-sm font-semibold"><span className="text-muted">Weekly budget {nzd(budget.target)}</span><span className={budget.over ? 'text-berry-600' : 'text-moss-700'}>{budget.over ? `${nzd(Math.abs(budget.remaining))} over` : `${nzd(budget.remaining)} left`}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className={cn('h-full rounded-full', budget.over ? 'bg-berry-500' : 'bg-moss-500')} style={{ width: `${budget.progress}%` }} /></div></div> : null}
        <button type="button" onClick={() => router.push('/shopping/mode')} disabled={!shopping.length} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-moss-600 text-[15px] font-bold text-white disabled:bg-line disabled:text-muted"><ShoppingBasketIcon className="h-[18px] w-[18px]" /> Start shopping mode</button>
        <button type="button" onClick={() => void prepareNewWorld()} disabled={!remaining.length || preparing} className="mt-2 flex h-11 w-full items-center justify-center rounded-2xl border border-moss-200 bg-white text-sm font-bold text-moss-700 disabled:opacity-50">{preparing ? 'Preparing…' : 'Prepare New World trolley'}</button>
      </div>
      {trolleyError ? <p className="mb-3 rounded-2xl bg-berry-50 px-4 py-3 text-sm font-semibold text-berry-700">{trolleyError}</p> : null}
      {actionMessage ? <p role="status" className="mb-3 rounded-2xl bg-moss-50 px-4 py-3 text-sm font-semibold text-moss-800">{actionMessage}</p> : null}
      <CommonOrderQuickAdd onAdded={(message) => setActionMessage(message)} />
      {pendingSearchJob && extensionOnline ? <section className="mb-3 rounded-2xl border border-honey-200 bg-honey-50 px-4 py-3 text-sm"><strong>Product search from another device</strong><p className="mt-0.5 text-xs text-muted">Search New World for “{pendingSearchJob.query}” and return the choices.</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => void processPendingSearchJob()} className="rounded-xl bg-moss-600 px-3 py-2 text-xs font-bold text-white">Process product search</button><button type="button" onClick={() => void dismissSearchActivity()} className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-muted">Dismiss</button></div></section> : null}
      {queuedSearchJob ? <section className="mb-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm"><div className="flex items-start justify-between gap-3"><div><strong>Live product search: {queuedSearchJob.status}</strong><p className="mt-0.5 text-xs text-muted">{queuedSearchJob.status === 'pending' ? 'Open Agrocer Shopping on the desktop with extension 0.1.6.' : queuedSearchJob.status === 'processing' ? 'Desktop Chrome is searching New World. This can take up to a minute.' : queuedSearchJob.products?.length ? `${queuedSearchJob.products.length} choices returned. Select one below.` : queuedSearchJob.message ?? 'No live products were returned.'}</p></div><button type="button" onClick={() => void dismissSearchActivity()} className="shrink-0 text-xs font-bold text-muted">Clear</button></div></section> : null}
      {remaining.length ? <NewWorldCatalogue items={remaining} extensionOnline={extensionOnline} liveProducts={extensionCandidates} liveMessages={extensionSearchMessages} searchingItemId={searchingItemId} onLiveSearch={searchNewWorldItem} onPreferenceSaved={(message) => { setActionMessage(message); return trolley ? prepareNewWorld() : undefined; }} /> : null}
      {trolley ? <section className="mb-5 rounded-2xl border border-moss-200 bg-moss-50 p-4" aria-label="New World trolley review">
        <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-ink">New World trolley</h2><p className="text-xs text-muted">{trolley.summary.total} items · {trolley.summary.ready} ready · {trolley.summary.needsReview} need review · {trolley.summary.unavailable} unavailable</p></div><button type="button" disabled={sending} className="text-xs font-bold text-muted disabled:opacity-50" onClick={clearPreparedTrolley}>Clear trolley</button></div>
        <div className="mt-3 space-y-2">
          {extensionOnline ? <div className="rounded-xl bg-moss-100 px-3 py-2 text-sm text-moss-800"><strong>Chrome trolley extension ready</strong><p className="text-xs">Products will be added in your normal visible New World tab.</p></div> : !trolley.companion.online ? <div className="rounded-xl bg-honey-50 px-3 py-2 text-sm text-ink"><strong>Desktop connection not active on this device</strong><p className="text-xs text-muted">On a phone, send ready items to the desktop. Open Agrocer there with the Chrome extension to process them.</p></div> : null}
          {pendingJob && extensionOnline ? <div className="rounded-xl bg-honey-50 px-3 py-2 text-sm"><strong>Queued trolley from another device</strong><p className="text-xs text-muted">{pendingJob.items.length} ready products are waiting.</p><button type="button" onClick={() => void processPendingJob()} className="mt-2 rounded-lg bg-moss-600 px-3 py-2 text-xs font-bold text-white">Process queued trolley</button></div> : null}
          {queuedJob ? <div className="rounded-xl bg-white px-3 py-2 text-sm"><div className="flex items-start justify-between gap-3"><div><strong>Desktop trolley job: {queuedJob.status}</strong><p className="text-xs text-muted">{queuedJob.status === 'pending' ? 'Open Agrocer on the desktop with the extension installed.' : queuedJob.status === 'processing' ? 'The desktop extension is processing this trolley.' : 'Results are available below.'}</p></div><button type="button" onClick={() => void dismissTrolleyActivity()} className="shrink-0 text-xs font-bold text-muted">Clear</button></div></div> : null}
          {trolley.lines.map((line) => <div key={line.shoppingItem.id} className="rounded-xl bg-white px-3 py-2 text-sm">
            <div className="flex justify-between gap-3"><span>{line.requestedQuantity} {line.shoppingItem.unit} {line.requestedText}</span><span className={line.status === 'ready' ? 'text-moss-700' : 'text-berry-600'}>{line.status === 'ready' ? 'Ready' : line.status === 'unavailable' ? 'Unavailable' : 'Needs review'}</span></div>
            {line.product ? <p className="mt-1 text-xs text-muted">{line.product.name}{line.product.size ? ` · ${line.product.size}` : ''}{line.product.price !== undefined ? ` · ${nzd(line.product.price)}` : ''}<br />{line.source === 'household-preference' ? 'Matched from household preference' : `Match confidence ${Math.round(line.confidence * 100)}%`}</p> : <p className="mt-1 text-xs text-muted">{line.reason}</p>}
            <div className="mt-2 flex flex-wrap gap-2">{line.source === 'household-preference' ? <button type="button" onClick={() => void togglePreference(line)} className="rounded-lg border border-line px-2 py-1.5 text-xs font-bold text-muted">{line.preferenceEnabled === false ? 'Use saved product automatically' : 'Pause saved product'}</button> : null}
            {line.requiresReview || line.source === 'household-preference' ? <button type="button" disabled={searchingItemId === line.shoppingItem.id} onClick={() => void searchNewWorld(line)} className="rounded-lg border border-moss-200 px-2 py-1.5 text-xs font-bold text-moss-700 disabled:opacity-50">{searchingItemId === line.shoppingItem.id ? 'Searching…' : line.source === 'household-preference' ? 'Search for a different product' : 'Choose New World product'}</button> : null}
            <button type="button" disabled={sending} onClick={() => removePreparedLine(line.shoppingItem.id)} className="rounded-lg border border-line px-2 py-1.5 text-xs font-bold text-muted disabled:opacity-50">Remove from this trolley</button></div>
            {extensionSearchMessages[line.shoppingItem.id] ? <p className="mt-1 text-xs text-muted">{extensionSearchMessages[line.shoppingItem.id]}</p> : null}
            {(extensionCandidates[line.shoppingItem.id] ?? line.candidates)?.length ? <div className="mt-2 space-y-1">{(extensionCandidates[line.shoppingItem.id] ?? line.candidates ?? []).map((candidate) => <button key={candidate.externalProductId ?? candidate.productUrl ?? candidate.name} type="button" onClick={() => void chooseProduct(line, candidate)} className="flex w-full items-center gap-2 rounded-lg border border-line px-2 py-2 text-left text-xs font-semibold text-ink"><ProductThumbnail src={candidate.imageUrl} alt="" className="h-12 w-12" /><span>Choose {candidate.name}{candidate.size ? ` · ${candidate.size}` : ''}{candidate.price !== undefined ? ` · ${nzd(candidate.price)}` : ''}</span></button>)}</div> : null}
          </div>)}
        </div>
        {sendResults ? <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm"><div className="flex items-start justify-between gap-3"><div><strong>{sendResults.filter((result) => result.status === 'added').length} / {sendResults.length} added</strong><p className="text-xs text-muted">{sendResults.some((result) => result.status !== 'added') ? 'Some products require your attention.' : 'Your trolley is ready for review.'}</p></div><button type="button" onClick={() => void dismissTrolleyActivity()} className="shrink-0 text-xs font-bold text-muted">Clear results</button></div><p className="mt-1 text-[11px] text-muted">This activity remains for reference until you clear it, even if an item leaves the shopping list.</p><ul className="mt-2 space-y-1.5">{sendResults.map((result) => { const line = trolley.lines.find((candidate) => candidate.shoppingItem.id === result.shoppingItemId); return <li key={result.shoppingItemId} className="rounded-lg bg-canvas px-2 py-1.5 text-xs"><span className={result.status === 'added' ? 'font-bold text-moss-700' : 'font-bold text-berry-600'}>{result.status === 'added' ? 'Added' : result.status.replaceAll('-', ' ')}</span>{` · ${line?.requestedText ?? result.confirmedProductName ?? 'Product'}`}{result.confirmedQuantity !== undefined ? ` · quantity ${result.confirmedQuantity}` : ''}{result.message ? <span className="mt-0.5 block text-muted">{result.message}</span> : null}</li>; })}</ul></div> : null}
        <button type="button" disabled={!trolley.summary.ready || sending} onClick={() => void sendToNewWorld()} className="mt-3 h-11 w-full rounded-2xl bg-moss-600 text-sm font-bold text-white disabled:bg-line disabled:text-muted">{sending ? 'Working…' : extensionOnline || trolley.companion.online ? `Add ${trolley.summary.ready} ready items to New World` : `Send ${trolley.summary.ready} ready items to desktop`}</button>
        <p className="mt-2 text-center text-xs text-muted">Agrocer prepares the trolley. You complete checkout and payment in New World.</p>
      </section> : null}

      {!shopping.length ? <EmptyState icon={ShoppingBasketIcon} title="Nothing on the list" body="Add what the family needs, or pull staples straight from your Products list." actionLabel="Add an item" onAction={openAdd} /> : <div className="space-y-5">{groups.map((group) => <section key={group.category} aria-label={group.category}><h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted">{group.category}</h2><div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">{group.items.map((item) => <ShoppingRow key={item.id} item={item} shoppingMode={false} onToggle={() => void toggleShoppingItem(item.id)} onEdit={() => { setEditing(item); setSheetOpen(true); }} />)}</div></section>)}</div>}
      {checked.length ? <button type="button" onClick={() => void clearChecked()} className="mt-5 w-full rounded-2xl border border-line bg-surface py-3 text-sm font-semibold text-muted">Clear {checked.length} bought items</button> : null}
    </main>
    <FloatingAddButton label="Add shopping item" onClick={openAdd} />
    <ShoppingItemSheet
      open={sheetOpen}
      onClose={() => setSheetOpen(false)}
      item={editing}
      products={products}
      onSave={handleSave}
      onDelete={editing ? () => void removeShoppingItem(editing.id) : undefined}
      extensionOnline={extensionOnline}
      liveProducts={extensionCandidates[draftMatchId] ?? []}
      liveMessage={extensionSearchMessages[draftMatchId]}
      searching={searchingItemId === draftMatchId}
      onLiveSearch={(query) => void searchNewWorldItem({ id: draftMatchId, name: query }, query)}
      onCancelSearch={() => cancelNewWorldSearch(draftMatchId)}
      onProductMatched={(message) => setActionMessage(message)}
    />
  </>;
}
