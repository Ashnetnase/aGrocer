import { describe, expect, it } from 'vitest';
import { NewWorldBrowserProvider } from './newWorldBrowser';

describe('NewWorldBrowserProvider', () => {
  it('returns the companion response without fabricating catalogue data', async () => {
    const product = { retailer: 'new-world' as const, name: 'Anchor Blue Milk 2L', availability: 'available' as const };
    const provider = new NewWorldBrowserProvider({ search: async () => [product] });
    expect(await provider.search('milk')).toEqual([product]);
  });
});
