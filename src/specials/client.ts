import type { SpecialOffer } from './types';

export async function searchSpecials(query: string): Promise<SpecialOffer[]> {
  const response = await fetch('/api/specials', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error('Specials search failed');
  const body = (await response.json()) as { offers?: SpecialOffer[] };
  return body.offers ?? [];
}
