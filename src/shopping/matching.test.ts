import { describe, expect, it } from 'vitest';
import type { ShoppingItem } from '@/domain/schemas/shopping';
import { ManualShoppingProvider } from './manual';
import { isPlausibleProductForItem, isSpecificNewWorldProduct, rankProduct, resolveShoppingItem } from './matching';

const milk: ShoppingItem = { id: 'item-1', name: 'Milk', category: 'Dairy', quantity: 2, unit: 'bottles', price: 0, priority: false, note: '', checked: false };
const anchor = { retailer: 'new-world' as const, externalProductId: 'anchor-2l', name: 'Anchor Blue Milk 2L', brand: 'Anchor', size: '2L', availability: 'available' as const };

describe('retailer matching', () => {
  it('normalises and ranks an exact product above an unrelated product', () => {
    expect(rankProduct('Anchor Blue Milk 2L', anchor)).toBeGreaterThan(0.95);
    expect(rankProduct('bananas', anchor)).toBeLessThan(0.6);
  });

  it('uses a confirmed household preference before provider search', async () => {
    let searched = false;
    const provider = new ManualShoppingProvider([]);
    provider.search = async () => { searched = true; return []; };
    const result = await resolveShoppingItem(milk, provider, {
      getPreferredProduct: async () => ({ shoppingItemKey: 'milk', retailer: 'new-world', product: anchor, defaultQuantity: 2, confidence: 1, enabled: true, lastConfirmedAt: new Date().toISOString() }),
    });
    expect(result.source).toBe('household-preference');
    expect(result.status).toBe('ready');
    expect(searched).toBe(false);
  });

  it('requires review when a saved product is unavailable', async () => {
    const result = await resolveShoppingItem(milk, new ManualShoppingProvider(), {
      getPreferredProduct: async () => ({ shoppingItemKey: 'milk', retailer: 'new-world', product: { ...anchor, availability: 'unavailable' }, defaultQuantity: 2, confidence: 1, enabled: true, lastConfirmedAt: new Date().toISOString() }),
    });
    expect(result.status).toBe('unavailable');
    expect(result.requiresReview).toBe(true);
  });

  it('keeps a paused preference visible but requires review', async () => {
    const result = await resolveShoppingItem(milk, new ManualShoppingProvider(), {
      getPreferredProduct: async () => ({ shoppingItemKey: 'milk', retailer: 'new-world', product: anchor, defaultQuantity: 2, confidence: 1, enabled: false, lastConfirmedAt: new Date().toISOString() }),
    });
    expect(result.preferenceEnabled).toBe(false);
    expect(result.status).toBe('needs-review');
  });

  it('rejects retailer search/category links as remembered products', async () => {
    const generic = {
      retailer: 'new-world' as const,
      name: "View all 'Milk'",
      productUrl: 'https://www.newworld.co.nz/shop/category/fresh-foods/milk',
      externalProductId: 'milk',
      availability: 'unknown' as const,
    };
    expect(isSpecificNewWorldProduct(generic)).toBe(false);
    const result = await resolveShoppingItem(milk, new ManualShoppingProvider(), {
      getPreferredProduct: async () => ({ shoppingItemKey: 'milk', retailer: 'new-world', product: generic, defaultQuantity: 4, confidence: 1, enabled: true, lastConfirmedAt: new Date().toISOString() }),
    });
    expect(result.status).toBe('needs-review');
    expect(result.reason).toContain('not a specific New World product');
  });

  it('does not silently reuse a snack product for an ingredient with the same flavour', async () => {
    const cornChips = {
      retailer: 'new-world' as const,
      name: 'Mexicano Tasty Cheese Corn Chips170g',
      productUrl: 'https://www.newworld.co.nz/shop/product/5000000',
      availability: 'available' as const,
    };
    expect(isPlausibleProductForItem('tastey cheese', cornChips)).toBe(false);
    const item = { ...milk, name: 'tastey cheese' };
    const result = await resolveShoppingItem(item, new ManualShoppingProvider(), {
      getPreferredProduct: async () => ({ shoppingItemKey: 'tastey cheese', retailer: 'new-world', product: cornChips, defaultQuantity: 2, confidence: 1, enabled: true, lastConfirmedAt: new Date().toISOString() }),
    });
    expect(result.status).toBe('needs-review');
    expect(result.reason).toContain('no longer looks like');
  });

  it('does not fabricate a match when no candidates exist', async () => {
    const result = await resolveShoppingItem(milk, new ManualShoppingProvider());
    expect(result.status).toBe('needs-review');
    expect(result.product).toBeUndefined();
  });
});
