'use client';

import { useEffect, useMemo, useState } from 'react';
import { SearchIcon, StoreIcon, XIcon } from 'lucide-react';
import type { ShoppingItem } from '@/domain/schemas/shopping';
import type { RetailerProduct } from '@/shopping/schemas';
import { nzd } from '@/lib/format';

interface CatalogueResponse {
  products: RetailerProduct[];
  source: 'live' | 'cache';
  storeId?: string;
  message?: string;
}

interface NewWorldCatalogueProps {
  items: ShoppingItem[];
  onPreferenceSaved: () => void | Promise<void>;
}

export function NewWorldCatalogue({ items, onPreferenceSaved }: NewWorldCatalogueProps) {
  const availableItems = useMemo(() => items.filter((item) => !item.checked), [items]);
  const [open, setOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<RetailerProduct[]>([]);
  const [source, setSource] = useState<'live' | 'cache'>('cache');
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState<string>();
  const selectedItem = availableItems.find((item) => item.id === selectedItemId);

  useEffect(() => {
    if (!availableItems.length) {
      setSelectedItemId('');
      return;
    }
    if (!availableItems.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(availableItems[0]!.id);
      setQuery(availableItems[0]!.name);
    }
  }, [availableItems, selectedItemId]);

  async function loadProducts(search = query) {
    if (busy) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const parameters = new URLSearchParams({ limit: '40' });
      if (search.trim()) parameters.set('q', search.trim());
      const response = await fetch(`/api/retailer/new-world/products?${parameters}`);
      const body = (await response.json().catch(() => null)) as CatalogueResponse | { error?: string } | null;
      if (!response.ok || !body || !('products' in body)) {
        setProducts([]);
        setMessage(body && 'error' in body && body.error ? body.error : 'Could not load New World products.');
        return;
      }
      setProducts(body.products);
      setSource(body.source);
      setMessage(body.message ?? (body.products.length ? undefined : 'No matching products were found.'));
    } catch {
      setProducts([]);
      setMessage('Could not reach the New World catalogue.');
    } finally {
      setBusy(false);
    }
  }

  async function chooseProduct(product: RetailerProduct) {
    if (!selectedItem) return;
    const identity = product.externalProductId ?? product.productUrl ?? product.name;
    setSavingId(identity);
    setMessage(undefined);
    try {
      const response = await fetch('/api/trolley/preferences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          shoppingItemKey: selectedItem.name,
          product,
          defaultQuantity: selectedItem.quantity,
        }),
      });
      if (!response.ok) throw new Error('save failed');
      setMessage(`${product.name} will be used for ${selectedItem.name} next time.`);
      await onPreferenceSaved();
    } catch {
      setMessage('Could not save that New World product preference.');
    } finally {
      setSavingId(undefined);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void loadProducts(query);
        }}
        className="mb-5 flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-left shadow-card"
      >
        <span>
          <span className="block text-sm font-bold text-ink">New World products</span>
          <span className="block text-xs text-muted">Browse prices and choose exact products for your list.</span>
        </span>
        <StoreIcon className="h-5 w-5 shrink-0 text-moss-600" aria-hidden />
      </button>
    );
  }

  return (
    <section className="mb-5 rounded-2xl border border-moss-200 bg-moss-50 p-4" aria-label="New World products">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-ink">New World products</h2>
          <p className="text-xs text-muted">Choose a real product and Agrocer will remember it for this item.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close New World products" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white">
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <label className="mt-3 block text-xs font-bold text-muted" htmlFor="new-world-shopping-item">Match product to</label>
      <select
        id="new-world-shopping-item"
        value={selectedItemId}
        onChange={(event) => {
          const id = event.target.value;
          setSelectedItemId(id);
          const item = availableItems.find((candidate) => candidate.id === id);
          if (item) setQuery(item.name);
        }}
        className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink"
      >
        {availableItems.map((item) => <option key={item.id} value={item.id}>{item.name} × {item.quantity}</option>)}
      </select>

      <form onSubmit={(event) => { event.preventDefault(); void loadProducts(); }} className="mt-2 flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search milk, bread, chicken…"
          aria-label="Search New World products"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-sm text-ink"
        />
        <button type="submit" disabled={busy} className="flex h-11 items-center gap-1.5 rounded-xl bg-moss-600 px-3 text-sm font-bold text-white disabled:bg-line">
          <SearchIcon className="h-4 w-4" /> {busy ? 'Loading…' : 'Search'}
        </button>
      </form>

      <p className="mt-2 text-xs text-muted">
        {source === 'live' ? 'Live catalogue prices' : 'Previously seen products'}
        {message ? ` · ${message}` : ''}
      </p>

      {products.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {products.map((product) => {
            const identity = product.externalProductId ?? product.productUrl ?? product.name;
            const currentPrice = product.specialPrice ?? product.price;
            return (
              <article key={identity} className="flex min-w-0 flex-col rounded-xl border border-line bg-white p-2.5">
                {product.imageUrl ? <span aria-hidden className="mb-2 h-24 rounded-lg bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${JSON.stringify(product.imageUrl)})` }} /> : <span className="mb-2 flex h-24 items-center justify-center rounded-lg bg-canvas"><StoreIcon className="h-6 w-6 text-muted" /></span>}
                <h3 className="text-xs font-bold leading-snug text-ink">{product.name}</h3>
                <p className="mt-0.5 text-[11px] text-muted">{[product.brand, product.size].filter(Boolean).join(' · ') || 'Size not listed'}</p>
                <div className="mt-auto pt-2">
                  <p className="text-sm font-extrabold text-moss-700">
                    {currentPrice === undefined ? 'Price unavailable' : nzd(currentPrice)}
                    {product.specialPrice !== undefined && product.price !== undefined ? <span className="ml-1 text-[11px] font-medium text-muted line-through">{nzd(product.price)}</span> : null}
                  </p>
                  <button
                    type="button"
                    onClick={() => void chooseProduct(product)}
                    disabled={!selectedItem || savingId === identity}
                    className="mt-2 min-h-10 w-full rounded-lg bg-moss-600 px-2 text-xs font-bold text-white disabled:bg-line"
                  >
                    {savingId === identity ? 'Saving…' : `Use for ${selectedItem?.name ?? 'item'}`}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

