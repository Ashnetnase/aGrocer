import fs from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { households } from '@/db/schema';
import type { Database } from '@/db/client';
import type { AgrocerRepositories } from '@/data/repositories/types';
import { createDrizzleRepositories } from './drizzleRepositories';

/**
 * Integration tests against a real Postgres database (ADR-013).
 *
 * These are excluded from `npm test` and run by `npm run test:db`, because they need
 * network access and credentials that CI does not have. Everything happens inside a
 * throwaway household that is deleted afterwards, so no family data is touched — the
 * foreign keys cascade, which is what keeps the cleanup a single delete.
 */

function databaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const file = fs.readFileSync('.env.local', 'utf8');
    return file.match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m)?.[1];
  } catch {
    return undefined;
  }
}

const url = databaseUrl();

describe.skipIf(!url)('drizzleRepositories against real Postgres', () => {
  let sql: ReturnType<typeof postgres>;
  let db: Database;
  let repos: AgrocerRepositories;
  let householdId: string;

  beforeAll(async () => {
    sql = postgres(url as string, { max: 1, prepare: false });
    db = drizzle(sql, { schema }) as unknown as Database;

    const [row] = await db
      .insert(households)
      .values({ name: 'Integration Test Household' })
      .returning();
    if (!row) throw new Error('Could not create the test household');
    householdId = row.id;
    repos = createDrizzleRepositories(db, householdId);
  });

  afterAll(async () => {
    if (householdId) await db.delete(households).where(eq(households.id, householdId));
    await sql?.end();
  });

  it('reads back the household it was scoped to', async () => {
    const household = await repos.household.get();
    expect(household.settings.householdName).toBe('Integration Test Household');
    expect(household.members).toEqual([]);
  });

  it('round-trips a shopping item through add, toggle and clearChecked', async () => {
    const added = await repos.shopping.add({
      name: 'Wholegrain bread',
      category: 'Bakery',
      quantity: 2,
      unit: 'loaf',
      price: 4.5,
      priority: false,
      note: undefined,
    });

    expect(added.id).toMatch(/^[0-9a-f-]{36}$/);
    // Price survives the integer-cents round trip rather than drifting in floating point.
    expect(added.price).toBe(4.5);

    const listed = await repos.shopping.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.name).toBe('Wholegrain bread');
    expect(listed[0]?.checked).toBe(false);

    const toggled = await repos.shopping.toggle(added.id);
    expect(toggled?.checked).toBe(true);

    await repos.shopping.clearChecked();
    expect(await repos.shopping.list()).toEqual([]);
  });

  it('merges a duplicate name into the existing quantity instead of duplicating', async () => {
    await repos.shopping.add({
      name: 'Milk',
      category: 'Dairy',
      quantity: 1,
      unit: 'bottle',
      price: 3.2,
      priority: false,
      note: undefined,
    });
    const merged = await repos.shopping.add({
      name: 'Milk',
      category: 'Dairy',
      quantity: 2,
      unit: 'bottle',
      price: 3.2,
      priority: false,
      note: undefined,
    });

    expect(merged.quantity).toBe(3);
    expect(await repos.shopping.list()).toHaveLength(1);

    await repos.shopping.remove(merged.id);
  });

  it('creates and adjusts a pantry item', async () => {
    const item = await repos.pantry.create({
      name: 'Rice',
      category: 'Pantry',
      quantity: 2,
      unit: 'kg',
      state: 'good',
      note: undefined,
    });

    const adjusted = await repos.pantry.adjustQuantity(item.id, -1);
    expect(adjusted?.quantity).toBe(1);

    // Quantity is a smallint with no negative check, so the floor is the repository's job.
    const floored = await repos.pantry.adjustQuantity(item.id, -5);
    expect(floored?.quantity).toBe(0);

    await repos.pantry.remove(item.id);
    expect(await repos.pantry.list()).toEqual([]);
  });

  it('assigns a meal to a plan slot and clears it again', async () => {
    const meal = await repos.meals.create({
      name: 'Sausage casserole',
      minutes: 40,
      serves: 5,
      tags: ['Kids'],
      image: undefined,
      description: 'Test meal',
      ingredients: ['sausages', 'onion'],
    });

    const plan = await repos.meals.assign('wed', 'dinner', meal.id);
    expect(plan.wed?.dinner).toBe(meal.id);

    const cleared = await repos.meals.clear('wed', 'dinner');
    expect(cleared.wed?.dinner).toBeUndefined();

    // Removing a meal must not leave a dangling id behind in the plan.
    await repos.meals.assign('thu', 'dinner', meal.id);
    await repos.meals.remove(meal.id);
    expect((await repos.meals.getPlan()).thu?.dinner).toBeUndefined();
  });

  it('refuses reset() against a shared database', async () => {
    await expect(repos.reset()).rejects.toThrow(/not supported against the database/);
  });
});
