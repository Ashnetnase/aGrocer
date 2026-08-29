import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchSpecials } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('searchSpecials', () => {
  it('posts the query and returns offers', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ offers: [{ productName: 'Milk', retailer: 'Manual', price: 3 }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    expect(await searchSpecials('milk')).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith('/api/specials', expect.objectContaining({ method: 'POST' }));
  });
});
