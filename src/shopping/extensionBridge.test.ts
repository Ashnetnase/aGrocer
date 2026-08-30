import { describe, expect, it } from 'vitest';
import { AGROCER_EXTENSION_SOURCE, extensionEventSchema } from './extensionBridge';

describe('New World extension bridge protocol', () => {
  it('accepts validated partial results', () => {
    expect(extensionEventSchema.safeParse({
      source: AGROCER_EXTENSION_SOURCE,
      type: 'AGROCER_NEW_WORLD_RESULTS',
      results: [{ shoppingItemId: '1', status: 'selector-failed', requestedQuantity: 2, message: 'not verified' }],
    }).success).toBe(true);
  });

  it('rejects a false success without required result fields', () => {
    expect(extensionEventSchema.safeParse({ source: AGROCER_EXTENSION_SOURCE, type: 'AGROCER_NEW_WORLD_RESULTS', results: [{ status: 'added' }] }).success).toBe(false);
  });

  it('validates retailer products returned by extension search', () => {
    expect(extensionEventSchema.safeParse({
      source: AGROCER_EXTENSION_SOURCE,
      type: 'AGROCER_NEW_WORLD_SEARCH_RESULTS',
      shoppingItemId: 'milk', status: 'ok',
      products: [{ retailer: 'new-world', name: 'Anchor Blue Milk 2L', productUrl: 'https://www.newworld.co.nz/shop/product/anchor', availability: 'unknown' }],
    }).success).toBe(true);
  });
});
