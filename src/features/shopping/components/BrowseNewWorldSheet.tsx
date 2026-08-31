'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, ExternalLinkIcon, SearchIcon } from 'lucide-react';
import type { Product } from '@/domain/schemas/product';
import type { ShoppingItemDraft } from '@/domain/schemas/shopping';
import type { RetailerProduct } from '@/shopping/schemas';
import { guessCategory } from '@/domain/services/categoryGuess';
import { BottomSheet } from '@/components/agrocer/BottomSheet';
import { nzd } from '@/lib/format';
import { ProductThumbnail } from './ProductThumbnail';

interface CatalogueResponse {
  products: RetailerProduct[];
  source: 'live' | 'cache';
  message?: string;
}

const PAGE_SIZE = 20;
const NEW_WORLD_SEARCH_URL = 'https://www.newworld.co.nz/shop/search';

interface BrowseNewWorldSheetProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onAdd: (draft: ShoppingItemDraft) => Promise<void>;
  onSaveMatch: (name: string, product: RetailerProduct, quantity: number) => Promise<void>;
  /** Lets the caller offer a way to switch to the plain add form instead. */
  onSwitchToManual: () => void;
}

/**
 * Add straight from the New World catalogue — no separate "type a generic item, then go match
 * it" step (2026-08-31, per Ash: that round trip is double handling for someone who already
 * knows exactly which product they want). Specials and cheap items sort to the top by default;
 * "Load more" grows the page size rather than adding real offset pagination — the cached
 * catalogue is small enough (a couple hundred products) that refetching with a bigger limit is
 * simpler than a cursor/offset story for no real benefit at this size.
 */
export function BrowseNewWorldSheet({ open, onClose, products, onAdd, onSaveMatch, onSwitchToManual }: BrowseNewWorldSheetProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RetailerProduct[]>([]);
  const [source, setSource] = useState<'live' | 'cache'>('cache');
  const [message, setMessage] = useState<string>();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [busy, setBusy] = useState(false);
  const [addingId, setAddingId] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setLimit(PAGE_SIZE);
    void search('', PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function search(term: string, requestLimit: number) {
    setBusy(true);
    setMessage(undefined);
    try {
      const parameters = new URLSearchParams({ limit: String(requestLimit), sort: 'value' });
      if (term.trim()) parameters.set('q', term.trim());
      const response = await fetch(`/api/retailer/new-world/products?${parameters}`);
      const body = (await response.json().catch(() => null)) as CatalogueResponse | { error?: string } | null;
      if (!response.ok || !body || !('products' in body)) {
        setResults([]);
        setMessage(body && 'error' in body && body.error ? body.error : 'Could not load New World products.');
        return;
      }
      setResults(body.products);
      setSource(body.source);
      setMessage(body.message ?? (body.products.length ? undefined : 'No matching products yet.'));
    } catch {
      setResults([]);
      setMessage('Could not reach the New World catalogue.');
    } finally {
      setBusy(false);
    }
  }

  const loadMore = () => {
    const next = limit + PAGE_SIZE;
    setLimit(next);
    void search(query, next);
  };

  async function addProduct(product: RetailerProduct) {
    const identity = product.externalProductId ?? product.productUrl ?? product.name;
    setAddingId(identity);
    try {
      const draft: ShoppingItemDraft = {
        name: product.name,
        category: guessCategory(product.name, products) ?? 'Pantry',
        quantity: 1,
        unit: product.unit ?? 'ea',
        price: product.specialPrice ?? product.price ?? 0,
        priority: false,
        note: undefined,
      };
      await onAdd(draft);
      await onSaveMatch(product.name, product, 1);
    } finally {
      setAddingId(undefined);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Browse New World"
      description="Add a real product straight to your list — already matched, ready for the trolley."
    >
      <form onSubmit={(event) => { event.preventDefault(); setLimit(PAGE_SIZE); void search(query, PAGE_SIZE); }} className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search milk, bread, chicken…"
          aria-label="Search New World products"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-sm text-ink"
        />
        <button type="submit" disabled={busy} className="flex h-11 items-center gap-1.5 rounded-xl bg-moss-600 px-3 text-sm font-bold text-white disabled:bg-line">
          <SearchIcon className="h-4 w-4" /> {busy ? 'Loading…' : 'Search'}
        </button>
      </form>

      <p className="mt-2 text-xs text-muted" role="status">
        {source === 'live' ? 'Live catalogue prices, specials first' : '24/7 household catalogue, specials first'}
        {message ? ` · ${message}` : ''}
      </p>

      {results.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {results.map((product) => {
            const identity = product.externalProductId ?? product.productUrl ?? product.name;
            const currentPrice = product.specialPrice ?? product.price;
            return (
              <article key={identity} className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-2.5">
                <ProductThumbnail src={product.imageUrl} alt={product.name} className="mb-2 h-24 w-full" />
                {product.specialPrice !== undefined ? (
                  <span className="mb-1 inline-block w-fit rounded-full bg-clay-50 px-1.5 py-0.5 text-[10px] font-bold text-clay-600">Special</span>
                ) : null}
                <h3 className="text-xs font-bold leading-snug text-ink">{product.name}</h3>
                <p className="mt-0.5 text-[11px] text-muted">{[product.brand, product.size].filter(Boolean).join(' · ') || 'Size not listed'}</p>
                <div className="mt-auto pt-2">
                  <p className="text-sm font-extrabold text-moss-700">
                    {currentPrice === undefined ? 'Price unavailable' : nzd(currentPrice)}
                    {product.specialPrice !== undefined && product.price !== undefined ? <span className="ml-1 text-[11px] font-medium text-muted line-through">{nzd(product.price)}</span> : null}
                  </p>
                  <button
                    type="button"
                    onClick={() => void addProduct(product)}
                    disabled={addingId === identity}
                    className="mt-2 flex min-h-10 w-full items-center justify-center gap-1 rounded-lg bg-moss-600 px-2 text-xs font-bold text-white disabled:bg-line"
                  >
                    {addingId === identity ? 'Adding…' : <><CheckIcon className="h-3.5 w-3.5" /> Add to list</>}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {results.length > 0 && results.length >= limit ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={busy}
          className="mt-3 h-11 w-full rounded-xl border border-line bg-canvas text-sm font-bold text-ink disabled:opacity-50"
        >
          {busy ? 'Loading…' : 'Load more'}
        </button>
      ) : null}

      <div className="mt-4 space-y-2 border-t border-line pt-3">
        <a
          href={query.trim() ? `${NEW_WORLD_SEARCH_URL}?q=${encodeURIComponent(query.trim())}` : NEW_WORLD_SEARCH_URL}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-sm font-bold text-ink"
        >
          <ExternalLinkIcon className="h-4 w-4" /> Not finding it? Look on New World&apos;s site
        </a>
        <button type="button" onClick={onSwitchToManual} className="block w-full text-center text-xs font-semibold text-moss-700">
          Or just type in an item
        </button>
      </div>
    </BottomSheet>
  );
}
