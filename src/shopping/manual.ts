import type { ShoppingProvider, ShoppingProduct } from './types';

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Provider used until a retailer supplies an official product feed. */
export class ManualShoppingProvider implements ShoppingProvider {
  readonly id = 'manual';
  readonly displayName = 'Manual catalogue';

  constructor(private readonly catalogue: ShoppingProduct[] = []) {}

  async search(query: string): Promise<ShoppingProduct[]> {
    const needle = normalise(query);
    if (!needle) return [];
    return this.catalogue
      .filter((product) => normalise(product.name).includes(needle) || needle.includes(normalise(product.name)))
      .slice(0, 10);
  }
}

export { normaliseRetailerText };

function normaliseRetailerText(value: string): string {
  return normalise(value);
}
