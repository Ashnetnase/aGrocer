import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchSpecials } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('searchSpecials', () => {
  it('does not call the API for too-short queries', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await searchSpecials('m')).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('posts the query and returns offers', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ offers: [{ productName: 'Milk', retailer: 'Manual', price: 3 }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    expect(await searchSpecials('milk')).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith('/api/specials', expect.objectContaining({ method: 'POST' }));
  });
});
