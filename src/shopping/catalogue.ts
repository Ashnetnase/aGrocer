import { z } from 'zod';
import { retailerProductSchema, type RetailerProduct } from './schemas';

const catalogueResponseSchema = z.object({
  products: z.array(retailerProductSchema).max(200),
  updatedAt: z.string().datetime().optional(),
});

export interface CatalogueSearchResult {
  products: RetailerProduct[];
  source: 'live' | 'cache';
  message?: string;
}

interface CatalogueClientOptions {
  baseUrl?: string;
  token?: string;
  fetcher?: typeof fetch;
}

/**
 * Server-only client for a household-operated New World catalogue collector.
 *
 * The collector owns retailer acquisition; Agrocer only requests validated product records.
 * This keeps scraping/browser work out of the PWA and makes a future official API a provider
 * replacement rather than another UI rewrite.
 */
export class NewWorldCatalogueClient {
  private readonly baseUrl?: string;
  private readonly token?: string;
  private readonly fetcher: typeof fetch;

  constructor(options: CatalogueClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.NEW_WORLD_CATALOGUE_URL;
    this.token = options.token ?? process.env.NEW_WORLD_CATALOGUE_TOKEN;
    this.fetcher = options.fetcher ?? fetch;
  }

  get configured(): boolean {
    return Boolean(this.baseUrl);
  }

  async search(query?: string, storeId?: string, limit = 40): Promise<RetailerProduct[]> {
    if (!this.baseUrl) throw new Error('New World catalogue is not configured.');
    const url = new URL('/v1/new-world/products', this.baseUrl);
    if (query?.trim()) url.searchParams.set('q', query.trim());
    if (storeId?.trim()) url.searchParams.set('storeId', storeId.trim());
    url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100)));

    const response = await this.fetcher(url, {
      headers: {
        accept: 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`New World catalogue returned HTTP ${response.status}.`);
    const parsed = catalogueResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error('New World catalogue returned invalid product data.');
    return parsed.data.products.map((product) => ({
      ...product,
      retailer: 'new-world',
      ...(storeId && !product.storeId ? { storeId } : {}),
    }));
  }
}

