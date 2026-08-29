import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewWorldCompanionClient } from './companion';
import { trolleyAddBatchSchema } from './schemas';

afterEach(() => vi.unstubAllGlobals());

describe('NewWorldCompanionClient', () => {
  it('rejects a batch without a product locator', () => {
    expect(trolleyAddBatchSchema.safeParse({ items: [{ shoppingItemId: '1', expectedName: 'Milk', quantity: 2 }] }).success).toBe(false);
  });

  it('preserves partial failures and never turns them into success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [
      { shoppingItemId: '1', status: 'added', requestedQuantity: 2, confirmedQuantity: 2, confirmedProductName: 'Milk' },
      { shoppingItemId: '2', status: 'selector-failed', requestedQuantity: 1, message: 'not verified' },
    ] }), { status: 200, headers: { 'content-type': 'application/json' } })));
    const results = await new NewWorldCompanionClient().addBatch([
      { shoppingItemId: '1', productUrl: 'https://www.newworld.co.nz/milk', expectedName: 'Milk', quantity: 2 },
      { shoppingItemId: '2', productUrl: 'https://www.newworld.co.nz/bread', expectedName: 'Bread', quantity: 1 },
    ]);
    expect(results.map((result) => result.status)).toEqual(['added', 'selector-failed']);
  });

  it('surfaces a retailer security check instead of returning an empty catalogue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 'blocked', products: [], message: 'New World presented a security check. Complete it in the visible browser, then retry.',
    }), { status: 200, headers: { 'content-type': 'application/json' } })));
    await expect(new NewWorldCompanionClient().search('milk')).rejects.toThrow('security check');
  });
});
