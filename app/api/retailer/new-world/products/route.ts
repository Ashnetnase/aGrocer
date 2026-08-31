import { NextResponse } from 'next/server';
import { z } from 'zod';
import { failed, parseJson } from '@/server/http';
import { serverShoppingProductRepository } from '@/server/repositories';
import { NewWorldCatalogueClient } from '@/shopping/catalogue';
import { isSpecificNewWorldProduct } from '@/shopping/matching';
import { retailerProductBatchSchema, type RetailerProduct } from '@/shopping/schemas';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  storeId: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
  /**
   * `value` sorts specials first, then cheapest-first — for browsing the catalogue itself
   * (Settings' "Browse New World" shopping-add mode). Left unset (`recent`, the default)
   * everywhere this route already had a caller — the item-matching tools search by name and
   * want the most-recently-seen match first, not the cheapest thing that matches.
   */
  sort: z.enum(['recent', 'value']).default('recent'),
});

/** Specials first, then cheapest current price first. Undefined prices sort last either way. */
function byValue(a: RetailerProduct, b: RetailerProduct): number {
  const aSpecial = a.specialPrice !== undefined;
  const bSpecial = b.specialPrice !== undefined;
  if (aSpecial !== bSpecial) return aSpecial ? -1 : 1;
  const aPrice = a.specialPrice ?? a.price ?? Number.POSITIVE_INFINITY;
  const bPrice = b.specialPrice ?? b.price ?? Number.POSITIVE_INFINITY;
  return aPrice - bPrice;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      q: url.searchParams.get('q') || undefined,
      storeId: url.searchParams.get('storeId') || process.env.NEW_WORLD_STORE_ID || undefined,
      limit: url.searchParams.get('limit') || undefined,
      sort: url.searchParams.get('sort') || undefined,
    });
    if (!parsed.success) return NextResponse.json({ error: 'Invalid catalogue search.' }, { status: 400 });

    const repository = await serverShoppingProductRepository();
    const catalogue = new NewWorldCatalogueClient();
    if (catalogue.configured) {
      try {
        const products = (await catalogue.search(parsed.data.q, parsed.data.storeId, parsed.data.limit))
          .filter(isSpecificNewWorldProduct);
        const saved = await Promise.all(products.map((product) => repository.saveProduct(product)));
        if (parsed.data.sort === 'value') saved.sort(byValue);
        return NextResponse.json({ products: saved, source: 'live', storeId: parsed.data.storeId, updatedAt: new Date().toISOString() });
      } catch (error) {
        console.error('[new-world-catalogue] live search failed; using cache', error);
      }
    }

    const products = (await repository.searchProducts(
      parsed.data.q,
      'new-world',
      parsed.data.storeId,
      parsed.data.limit,
    )).filter(isSpecificNewWorldProduct);
    if (parsed.data.sort === 'value') products.sort(byValue);
    return NextResponse.json({
      products,
      source: 'cache',
      storeId: parsed.data.storeId,
      updatedAt: products[0]?.lastSeenAt,
      message: catalogue.configured
        ? 'The external New World feed is offline. The 24/7 household catalogue is still available.'
        : products.length
          ? 'The 24/7 household catalogue is available. Desktop searches refresh it with current products.'
          : 'No saved products match yet. Use desktop Chrome to add them to the household catalogue.',
    });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, retailerProductBatchSchema);
    if (!body.ok) return body.response;
    const products = body.data.products.filter(isSpecificNewWorldProduct);
    if (!products.length) return NextResponse.json({ error: 'No specific New World products were supplied.' }, { status: 400 });
    const repository = await serverShoppingProductRepository();
    const saved = await Promise.all(products.map((product) => repository.saveProduct(product)));
    return NextResponse.json({ products: saved, updatedAt: new Date().toISOString() });
  } catch (error) {
    return failed(error);
  }
}
