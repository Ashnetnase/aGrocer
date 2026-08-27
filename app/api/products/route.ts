import { NextResponse } from 'next/server';
import { serverRepositories } from '@/server/repositories';
import { failed } from '@/server/http';

/**
 * The product catalogue. Read-only as a collection: the contract has no create method,
 * because Stage 1 only ever read a fixed catalogue. `npm run db:seed` is currently the only
 * thing that puts products into Postgres — a gap Stage 2 should close deliberately rather
 * than by quietly inventing a POST here.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = await serverRepositories().products.list();
    return NextResponse.json({ products });
  } catch (error) {
    return failed(error);
  }
}
