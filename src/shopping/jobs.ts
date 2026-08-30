import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '@/db/client';
import { trolleyJobs } from '@/db/schema';
import { trolleyAddBatchSchema, trolleyAddResultSchema, trolleyJobSchema, type TrolleyAddItem, type TrolleyAddResult, type TrolleyJob } from './schemas';

function toJob(row: typeof trolleyJobs.$inferSelect): TrolleyJob {
  return trolleyJobSchema.parse({
    id: row.id,
    retailer: row.retailer,
    status: row.status,
    items: row.items,
    ...(row.results ? { results: row.results } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row.completedAt ? { completedAt: row.completedAt.toISOString() } : {}),
  });
}

export function createTrolleyJobRepository(db: Database, householdId: string) {
  return {
    async create(items: TrolleyAddItem[]): Promise<TrolleyJob> {
      const validated = trolleyAddBatchSchema.parse({ items }).items;
      const [row] = await db.insert(trolleyJobs).values({ householdId, items: validated }).returning();
      if (!row) throw new Error('Creating trolley job returned no row');
      return toJob(row);
    },
    async listPending(): Promise<TrolleyJob[]> {
      const rows = await db.select().from(trolleyJobs).where(and(
        eq(trolleyJobs.householdId, householdId), eq(trolleyJobs.status, 'pending'),
      )).orderBy(desc(trolleyJobs.createdAt)).limit(10);
      return rows.map(toJob);
    },
    async get(id: string): Promise<TrolleyJob | undefined> {
      const [row] = await db.select().from(trolleyJobs).where(and(eq(trolleyJobs.id, id), eq(trolleyJobs.householdId, householdId))).limit(1);
      return row ? toJob(row) : undefined;
    },
    async markProcessing(id: string): Promise<TrolleyJob | undefined> {
      const [row] = await db.update(trolleyJobs).set({ status: 'processing', updatedAt: new Date() }).where(and(
        eq(trolleyJobs.id, id), eq(trolleyJobs.householdId, householdId), eq(trolleyJobs.status, 'pending'),
      )).returning();
      return row ? toJob(row) : undefined;
    },
    async complete(id: string, results: TrolleyAddResult[]): Promise<TrolleyJob | undefined> {
      const validated = trolleyAddResultSchema.array().parse(results);
      const status = validated.every((result) => result.status === 'added') ? 'completed' : 'attention';
      const [row] = await db.update(trolleyJobs).set({ status, results: validated, updatedAt: new Date(), completedAt: new Date() }).where(and(
        eq(trolleyJobs.id, id), eq(trolleyJobs.householdId, householdId), eq(trolleyJobs.status, 'processing'),
      )).returning();
      return row ? toJob(row) : undefined;
    },
  };
}
