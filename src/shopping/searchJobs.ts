import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '@/db/client';
import { retailerProductSearchJobs } from '@/db/schema';
import {
  retailerProductSearchJobSchema,
  retailerProductSchema,
  type RetailerProduct,
  type RetailerProductSearchJob,
} from './schemas';
import { normaliseRetailerText } from './manual';

function toJob(row: typeof retailerProductSearchJobs.$inferSelect): RetailerProductSearchJob {
  return retailerProductSearchJobSchema.parse({
    id: row.id,
    retailer: row.retailer,
    shoppingItemId: row.shoppingItemId,
    shoppingItemKey: row.shoppingItemKey,
    query: row.query,
    ...(row.storeId ? { storeId: row.storeId } : {}),
    status: row.status,
    ...(row.products ? { products: row.products } : {}),
    ...(row.message ? { message: row.message } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row.completedAt ? { completedAt: row.completedAt.toISOString() } : {}),
  });
}
export function createRetailerProductSearchJobRepository(db: Database, householdId: string) {
  return {
    async create(input: { shoppingItemId: string; shoppingItemKey: string; query: string; storeId?: string }): Promise<RetailerProductSearchJob> {
      const [row] = await db.insert(retailerProductSearchJobs).values({
        householdId,
        shoppingItemId: input.shoppingItemId,
        shoppingItemKey: normaliseRetailerText(input.shoppingItemKey),
        query: input.query.trim(),
        storeId: input.storeId ?? null,
      }).returning();
      if (!row) throw new Error('Creating retailer product search job returned no row');
      return toJob(row);
    },
    async listPending(): Promise<RetailerProductSearchJob[]> {
      const rows = await db.select().from(retailerProductSearchJobs).where(and(
        eq(retailerProductSearchJobs.householdId, householdId),
        eq(retailerProductSearchJobs.status, 'pending'),
      )).orderBy(desc(retailerProductSearchJobs.createdAt)).limit(10);
      return rows.map(toJob);
    },
    async get(id: string): Promise<RetailerProductSearchJob | undefined> {
      const [row] = await db.select().from(retailerProductSearchJobs).where(and(
        eq(retailerProductSearchJobs.id, id),
        eq(retailerProductSearchJobs.householdId, householdId),
      )).limit(1);
      return row ? toJob(row) : undefined;
    },
    async markProcessing(id: string): Promise<RetailerProductSearchJob | undefined> {
      const [row] = await db.update(retailerProductSearchJobs).set({ status: 'processing', updatedAt: new Date() }).where(and(
        eq(retailerProductSearchJobs.id, id),
        eq(retailerProductSearchJobs.householdId, householdId),
        eq(retailerProductSearchJobs.status, 'pending'),
      )).returning();
      return row ? toJob(row) : undefined;
    },
    async complete(id: string, products: RetailerProduct[], message?: string): Promise<RetailerProductSearchJob | undefined> {
      const validated = retailerProductSchema.array().max(100).parse(products);
      const [row] = await db.update(retailerProductSearchJobs).set({
        status: validated.length ? 'completed' : 'attention',
        products: validated,
        message: message ?? null,
        updatedAt: new Date(),
        completedAt: new Date(),
      }).where(and(
        eq(retailerProductSearchJobs.id, id),
        eq(retailerProductSearchJobs.householdId, householdId),
        eq(retailerProductSearchJobs.status, 'processing'),
      )).returning();
      return row ? toJob(row) : undefined;
    },
  };
}
