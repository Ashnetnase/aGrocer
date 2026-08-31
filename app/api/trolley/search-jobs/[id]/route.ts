import { NextResponse } from 'next/server';
import { z } from 'zod';
import { failed, notFound, parseJson } from '@/server/http';
import {
  serverRetailerProductSearchJobRepository,
  serverShoppingProductRepository,
} from '@/server/repositories';
import { retailerProductSchema } from '@/shopping/schemas';
import { isSpecificNewWorldProduct } from '@/shopping/matching';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = await (await serverRetailerProductSearchJobRepository()).get(id);
    return job ? NextResponse.json(job) : notFound('Product search job');
  } catch (error) {
    return failed(error);
  }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await parseJson(request, z.union([
      z.object({ action: z.literal('start') }),
      z.object({ products: z.array(retailerProductSchema).max(100), message: z.string().max(500).optional() }),
    ]));
    if (!body.ok) return body.response;
    const jobs = await serverRetailerProductSearchJobRepository();
    if ('action' in body.data) {
      const job = await jobs.markProcessing(id);
      return job ? NextResponse.json(job) : notFound('Pending product search job');
    }
    const validProducts = body.data.products.filter(isSpecificNewWorldProduct);
    const productRepository = await serverShoppingProductRepository();
    const saved = await Promise.all(validProducts.map((product) => productRepository.saveProduct(product)));
    const job = await jobs.complete(id, saved, body.data.message);
    return job ? NextResponse.json(job) : notFound('Processing product search job');
  } catch (error) {
    return failed(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = await (await serverRetailerProductSearchJobRepository()).dismiss(id);
    return job ? NextResponse.json(job) : notFound('Product search job');
  } catch (error) {
    return failed(error);
  }
}
