import { NextResponse } from 'next/server';
import { z } from 'zod';
import { failed, parseJson } from '@/server/http';
import { serverShoppingProductRepository } from '@/server/repositories';
import { retailerProductSchema } from '@/shopping/schemas';

const saveSchema = z.object({
  shoppingItemKey: z.string().trim().min(1).max(200),
  product: retailerProductSchema,
  defaultQuantity: z.number().int().min(1).max(99),
});

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, saveSchema);
    if (!body.ok) return body.response;
    const repository = await serverShoppingProductRepository();
    return NextResponse.json(await repository.savePreferredProduct(
      body.data.shoppingItemKey,
      body.data.product,
      body.data.defaultQuantity,
    ));
  } catch (error) {
    return failed(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await parseJson(request, z.object({ shoppingItemKey: z.string().trim().min(1).max(200), storeId: z.string().max(100).optional() }));
    if (!body.ok) return body.response;
    const repository = await serverShoppingProductRepository();
    await repository.removePreferredProduct(body.data.shoppingItemKey, 'new-world', body.data.storeId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return failed(error);
  }
}
