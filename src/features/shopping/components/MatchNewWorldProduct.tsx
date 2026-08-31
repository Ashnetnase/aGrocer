'use client';

import { useState } from 'react';
import { CheckIcon, SearchIcon, StoreIcon } from 'lucide-react';
import type { RetailerProduct } from '@/shopping/schemas';
import { nzd } from '@/lib/format';
import { ProductThumbnail } from './ProductThumbnail';

interface CatalogueResponse {
  products: RetailerProduct[];
  source: 'live' | 'cache';
  message?: string;
}

interface MatchNewWorldProductProps {
  itemName: string;
  quantity: number;
  extensionOnline: boolean;
  liveProducts: RetailerProduct[];
  liveMessage?: string;
  searching: boolean;
  onLiveSearch: (query: string) => void;
  onCancelSearch: () => void;
  onSaved: (message: string) => void;
  /** The item's own name field is renamed to the exact New World title once a product is chosen. */
  onMatchedName: (name: string) => void;
}

/** Lets a product be matched to New World while adding/editing a shopping item, so it is ready without a separate trolley step. */
export function MatchNewWorldProduct({ itemName, quantity, extensionOnline, liveProducts, liveMessage, searching, onLiveSearch, onCancelSearch, onSaved, onMatchedName }: MatchNewWorldProductProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(itemName);
  const [products, setProducts] = useState<RetailerProduct[]>([]);
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState<string>();
  const [saved, setSaved] = useState<{ name: string } | undefined>();

  const displayedProducts = liveProducts.length ? liveProducts : products;
  const trimmedName = itemName.trim();

  async function search(term = query) {
    const value = term.trim() || trimmedName;
    if (!value) return;
    setBusy(true);
    setMessage(undefined);
    if (extensionOnline) {
      onLiveSearch(value);
      setBusy(false);
      return;
    }
    try {
      const parameters = new URLSearchParams({ limit: '40', q: value });
      const response = await fetch(`/api/retailer/new-world/products?${parameters}`);
      const body = (await response.json().catch(() => null)) as CatalogueResponse | { error?: string } | null;
      if (!response.ok || !body || !('products' in body)) {
        setProducts([]);
        setMessage(body && 'error' in body && body.error ? body.error : 'Could not load New World products.');
        return;
      }
      setProducts(body.products);
      setMessage(body.message ?? (body.products.length ? undefined : 'No matching products were found.'));
    } catch {
      setProducts([]);
      setMessage('Could not reach the New World catalogue.');
    } finally {
      setBusy(false);
    }
  }

  async function chooseProduct(product: RetailerProduct) {
    if (!trimmedName) return;
    const identity = product.externalProductId ?? product.productUrl ?? product.name;
    setSavingId(identity);
    setMessage(undefined);
    try {
      const response = await fetch('/api/trolley/preferences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shoppingItemKey: trimmedName, product, defaultQuantity: Math.max(1, quantity) }),
      });
      if (!response.ok) throw new Error('save failed');
      const confirmation = `${product.name} will be used for ${trimmedName} next time.`;
      setSaved({ name: product.name });
      setOpen(false);
      onMatchedName(product.name.trim());
      onSaved(confirmation);
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
        onClick={() => { setOpen(true); setQuery(trimmedName); setSaved(undefined); void search(trimmedName); }}
        disabled={!trimmedName}
        className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-left disabled:opacity-50"
      >
        <span>
          <span className="block text-sm font-bold text-ink">
            {saved ? `Matched: ${saved.name}` : 'Match a New World product now'}
          </span>
          <span className="block text-xs text-muted">
            {saved ? 'Change the match' : 'Choose the exact product so it is ready without a separate trolley step.'}
          </span>
        </span>
        {saved ? <CheckIcon className="h-5 w-5 shrink-0 text-moss-600" aria-hidden /> : <StoreIcon className="h-5 w-5 shrink-0 text-moss-600" aria-hidden />}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-moss-200 bg-moss-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-ink">Match a New World product</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-muted">Close</button>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); void search(); }} className="mt-2 flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search milk, bread, chicken…"
          aria-label="Search New World products"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-sm text-ink"
        />
        <button type="submit" disabled={busy || searching} className="flex h-11 items-center gap-1.5 rounded-xl bg-moss-600 px-3 text-sm font-bold text-white disabled:bg-line">
          <SearchIcon className="h-4 w-4" /> {busy || searching ? 'Searching…' : 'Search'}
        </button>
        {searching ? (
          <button
            type="button"
            onClick={onCancelSearch}
            className="flex h-11 shrink-0 items-center rounded-xl border border-line bg-white px-3 text-sm font-bold text-muted"
          >
            Stop
          </button>
        ) : null}
      </form>
      {liveMessage || message ? <p className="mt-2 text-xs text-muted" role="status">{liveMessage ?? message}</p> : null}
      {displayedProducts.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {displayedProducts.map((product) => {
            const identity = product.externalProductId ?? product.productUrl ?? product.name;
            const currentPrice = product.specialPrice ?? product.price;
            return (
              <article key={identity} className="flex min-w-0 flex-col rounded-xl border border-line bg-white p-2.5">
                <ProductThumbnail src={product.imageUrl} alt={product.name} className="mb-2 h-24 w-full" />
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
                    disabled={savingId === identity}
                    className="mt-2 min-h-10 w-full rounded-lg bg-moss-600 px-2 text-xs font-bold text-white disabled:bg-line"
                  >
                    {savingId === identity ? 'Saving…' : 'Use this product'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
