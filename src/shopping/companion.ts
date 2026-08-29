import { retailerProductSchema, trolleyAddBatchSchema, trolleyAddResultSchema, type TrolleyAddItem, type TrolleyAddResult } from './schemas';

export class NewWorldCompanionClient {
  constructor(private readonly baseUrl = process.env.NEW_WORLD_COMPANION_URL ?? 'http://127.0.0.1:4317') {}

  private async request(path: string, init?: RequestInit): Promise<unknown> {
    const token = process.env.NEW_WORLD_COMPANION_TOKEN;
    const response = await fetch(new URL(path, this.baseUrl), {
      ...init,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...init?.headers },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`New World companion returned ${response.status}`);
    return response.json() as Promise<unknown>;
  }

  async health(): Promise<boolean> {
    try { await this.request('/health'); return true; } catch { return false; }
  }

  async search(query: string, storeId?: string) {
    const raw = await this.request('/newworld/search', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, ...(storeId ? { storeId } : {}) }),
    });
    const result = raw as { status?: unknown; products?: unknown; message?: unknown };
    if (result.status === 'blocked') throw new Error(typeof result.message === 'string' ? result.message : 'New World blocked the search.');
    return retailerProductSchema.array().parse(result.products);
  }

  async addBatch(items: TrolleyAddItem[]): Promise<TrolleyAddResult[]> {
    const request = trolleyAddBatchSchema.parse({ items });
    const raw = await this.request('/newworld/trolley/add-batch', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request),
    });
    return trolleyAddResultSchema.array().parse((raw as { results?: unknown }).results);
  }
}
