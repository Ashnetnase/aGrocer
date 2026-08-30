import { NextResponse } from 'next/server';
import { z } from 'zod';
import { failed } from '@/server/http';
import { serverShoppingProductRepository } from '@/server/repositories';
import { NewWorldCatalogueClient } from '@/shopping/catalogue';
import { isSpecificNewWorldProduct } from '@/shopping/matching';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  storeId: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      q: url.searchParams.get('q') || undefined,
      storeId: url.searchParams.get('storeId') || process.env.NEW_WORLD_STORE_ID || undefined,
      limit: url.searchParams.get('limit') || undefined,
    });
    if (!parsed.success) return NextResponse.json({ error: 'Invalid catalogue search.' }, { status: 400 });

    const repository = await serverShoppingProductRepository();
    const catalogue = new NewWorldCatalogueClient();
    if (catalogue.configured) {
      try {
        const products = (await catalogue.search(parsed.data.q, parsed.data.storeId, parsed.data.limit))
          .filter(isSpecificNewWorldProduct);
        const saved = await Promise.all(products.map((product) => repository.saveProduct(product)));
        return NextResponse.json({ products: saved, source: 'live', storeId: parsed.data.storeId });
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
    return NextResponse.json({
      products,
      source: 'cache',
      storeId: parsed.data.storeId,
      message: catalogue.configured
        ? 'The live New World catalogue is offline. Showing previously seen products.'
        : 'Live New World catalogue is not configured. Showing previously seen products.',
    });
  } catch (error) {
    return failed(error);
  }
}
