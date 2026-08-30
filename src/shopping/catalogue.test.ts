import { describe, expect, it, vi } from 'vitest';
import { NewWorldCatalogueClient } from './catalogue';

describe('NewWorldCatalogueClient', () => {
  it('requests the configured store and validates real product fields', async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, _init) => new Response(JSON.stringify({ products: [{
      retailer: 'new-world', externalProductId: 'milk-2l', name: 'Anchor Blue Milk',
      size: '2L', price: 5.8, specialPrice: 5, availability: 'available',
    }] }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const client = new NewWorldCatalogueClient({ baseUrl: 'http://catalogue.local:4320', token: 'secret', fetcher });

    const products = await client.search('milk', 'store-123', 24);

    expect(products[0]).toMatchObject({ name: 'Anchor Blue Milk', storeId: 'store-123', price: 5.8 });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe('http://catalogue.local:4320/v1/new-world/products?q=milk&storeId=store-123&limit=24');
    expect(init?.headers).toMatchObject({ authorization: 'Bearer secret' });
  });

  it('rejects malformed catalogue data instead of displaying invented products', async () => {
    const client = new NewWorldCatalogueClient({
      baseUrl: 'http://catalogue.local:4320',
      fetcher: async () => new Response(JSON.stringify({ products: [{ name: '', price: -1 }] })),
    });
    await expect(client.search('milk')).rejects.toThrow('invalid product data');
  });
});
