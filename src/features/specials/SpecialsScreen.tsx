'use client';
import { useState } from 'react';
import { SearchIcon, TagIcon } from 'lucide-react';
import { searchSpecials } from '@/specials/client';
import type { SpecialOffer } from '@/specials/types';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { nzd } from '@/lib/format';

export function SpecialsScreen() {
  const [query, setQuery] = useState('');
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [message, setMessage] = useState('Search configured specials');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    try { const result = await searchSpecials(query); setOffers(result); setMessage(result.length ? '' : 'No specials found.'); }
    catch { setMessage('Specials are unavailable right now.'); }
  }
  return <><ScreenHeader title="Specials" subtitle="Compare offers before you shop" />
    <main className="flex-1 overflow-y-auto px-5 pb-8 pt-4">
      <form onSubmit={submit} className="flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search milk, rice…" aria-label="Search specials" className="min-h-12 flex-1 rounded-2xl border border-line bg-canvas px-4 text-base" /><button className="rounded-2xl bg-moss-700 px-4 text-white" aria-label="Search"><SearchIcon /></button></form>
      {offers.length ? <ul className="mt-5 space-y-2">{offers.map((offer) => <li key={`${offer.retailer}-${offer.productName}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4"><TagIcon className="text-honey-600" /><div><p className="font-bold text-ink">{offer.productName}</p><p className="text-sm text-muted">{offer.retailer} · {nzd(offer.price)}</p></div></li>)}</ul> : <p className="mt-6 text-center text-muted">{message}</p>}
    </main></>;
}
