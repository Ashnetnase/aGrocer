import fs from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { households, inventoryEvents } from '@/db/schema';
import type { Database } from '@/db/client';
import type { AgrocerRepositories } from '@/data/repositories/types';
import { createDrizzleRepositories } from './drizzleRepositories';
import { createShoppingProductRepository, type ShoppingProductRepository } from '@/shopping/repository';
import { createTrolleyJobRepository } from '@/shopping/jobs';
import { createRetailerProductSearchJobRepository } from '@/shopping/searchJobs';

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
  let shoppingProducts: ShoppingProductRepository;
  let trolleyJobRepository: ReturnType<typeof createTrolleyJobRepository>;
  let searchJobRepository: ReturnType<typeof createRetailerProductSearchJobRepository>;

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
    shoppingProducts = createShoppingProductRepository(db, householdId);
    trolleyJobRepository = createTrolleyJobRepository(db, householdId);
    searchJobRepository = createRetailerProductSearchJobRepository(db, householdId);
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

  it('round-trips and clears the weekly grocery budget', async () => {
    const set = await repos.household.updateSettings({ weeklyBudget: 250.5 });
    expect(set.weeklyBudget).toBe(250.5);

    const cleared = await repos.household.updateSettings({ weeklyBudget: null });
    expect(cleared.weeklyBudget).toBeNull();
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

  it('persists, replaces and removes a household retailer product preference', async () => {
    const product = {
      retailer: 'new-world' as const,
      externalProductId: 'integration-anchor-2l',
      name: 'Anchor Blue Milk 2L',
      brand: 'Anchor',
      size: '2L',
      productUrl: 'https://www.newworld.co.nz/shop/product/integration-anchor-2l',
      availability: 'available' as const,
    };
    await shoppingProducts.savePreferredProduct('Milk', product, 2);
    const remembered = await shoppingProducts.getPreferredProduct('milk', 'new-world');
    expect(remembered?.product.name).toBe('Anchor Blue Milk 2L');
    expect(remembered?.defaultQuantity).toBe(2);
    expect(remembered?.enabled).toBe(true);
    expect(await shoppingProducts.searchProducts('blue milk', 'new-world')).toEqual([
      expect.objectContaining({ externalProductId: 'integration-anchor-2l', name: 'Anchor Blue Milk 2L' }),
    ]);

    await shoppingProducts.setPreferenceEnabled('milk', 'new-world', false);
    expect((await shoppingProducts.getPreferredProduct('milk', 'new-world'))?.enabled).toBe(false);

    await shoppingProducts.removePreferredProduct('MILK', 'new-world');
    expect(await shoppingProducts.getPreferredProduct('milk', 'new-world')).toBeUndefined();
  });

  it('persists a cross-device trolley job and its partial results', async () => {
    const job = await trolleyJobRepository.create([{
      shoppingItemId: 'integration-milk',
      productUrl: 'https://www.newworld.co.nz/shop/product/integration-milk',
      expectedName: 'Integration Milk 2L',
      quantity: 2,
    }]);
    expect(job.status).toBe('pending');
    expect((await trolleyJobRepository.listPending()).some((candidate) => candidate.id === job.id)).toBe(true);
    expect((await trolleyJobRepository.markProcessing(job.id))?.status).toBe('processing');
    const completed = await trolleyJobRepository.complete(job.id, [{
      shoppingItemId: 'integration-milk', status: 'quantity-mismatch', requestedQuantity: 2,
      confirmedQuantity: 1,
    }]);
    expect(completed?.status).toBe('attention');
    expect(completed?.results?.[0]?.status).toBe('quantity-mismatch');
    expect((await trolleyJobRepository.dismiss(job.id))?.status).toBe('dismissed');
  });

  it('returns a desktop product search to the originating device', async () => {
    const job = await searchJobRepository.create({
      shoppingItemId: 'integration-milk-search', shoppingItemKey: 'Milk', query: 'blue milk',
    });
    expect(job.status).toBe('pending');
    expect((await searchJobRepository.listPending()).some((candidate) => candidate.id === job.id)).toBe(true);
    expect((await searchJobRepository.markProcessing(job.id))?.status).toBe('processing');
    const completed = await searchJobRepository.complete(job.id, [{
      retailer: 'new-world', externalProductId: 'integration-search-milk', name: 'Integration Blue Milk 2L',
      productUrl: 'https://www.newworld.co.nz/shop/product/integration-search-milk', availability: 'available',
    }]);
    expect(completed).toMatchObject({ status: 'completed', products: [{ name: 'Integration Blue Milk 2L' }] });
    expect((await searchJobRepository.dismiss(job.id))?.status).toBe('dismissed');
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
      ingredientDetails: [
        { name: 'sausages', amount: 6, unit: 'item' },
        { name: 'onion', amount: 1, unit: 'item' },
      ],
    });

    expect((await repos.meals.list()).find((candidate) => candidate.id === meal.id)?.ingredientDetails)
      .toEqual([
        { name: 'sausages', amount: 6, unit: 'item' },
        { name: 'onion', amount: 1, unit: 'item' },
      ]);

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

  it('records every pantry change, and the history outlives the item', async () => {
    const item = await repos.pantry.create({
      name: 'Audit rice',
      category: 'Pantry',
      quantity: 2,
      unit: 'kg',
      state: 'good',
      note: undefined,
    });
    await repos.pantry.adjustQuantity(item.id, 3);
    await repos.pantry.remove(item.id);

    // Scoped by name, not just by household: earlier tests in this file also touch the
    // pantry, and their changes are audited too — which is itself the behaviour working.
    const events = await db
      .select()
      .from(inventoryEvents)
      .where(
        and(
          eq(inventoryEvents.householdId, householdId),
          eq(inventoryEvents.itemName, 'Audit rice'),
        ),
      )
      .orderBy(inventoryEvents.createdAt);

    expect(events.map((event) => event.kind)).toEqual(['created', 'adjusted', 'removed']);
    expect(events[1]?.quantityDelta).toBe(3);
    expect(events[1]?.quantityAfter).toBe(5);

    // The point of the whole table: the name is still readable with the item deleted, and
    // the foreign key has gone null rather than taking the history with it.
    expect(events.every((event) => event.itemName === 'Audit rice')).toBe(true);
    expect(events.every((event) => event.pantryItemId === null)).toBe(true);
  });

  it('round-trips meal feedback and keeps it newest first', async () => {
    const meal = await repos.meals.create({
      name: 'Feedback test pie',
      minutes: 30,
      serves: 4,
      tags: [],
      image: undefined,
      description: '',
      ingredients: [],
    });

    await repos.feedback.add({ mealId: meal.id, rating: 'ok', ateOn: '2026-08-20' });
    const loved = await repos.feedback.add({
      mealId: meal.id,
      rating: 'loved',
      note: 'Seconds all round',
      ateOn: '2026-08-27',
    });

    const history = await repos.feedback.list(meal.id);
    expect(history).toHaveLength(2);
    expect(history[0]?.id).toBe(loved.id);
    expect(history[0]?.note).toBe('Seconds all round');
    // Optional in the domain, NULL in storage — the mapper must not surface null.
    expect(history[1]?.note).toBeUndefined();
    expect(history[1]?.memberId).toBeUndefined();
  });

  it('deletes a meal’s feedback with the meal, since it cannot be read without it', async () => {
    const meal = await repos.meals.create({
      name: 'Cascade test',
      minutes: 10,
      serves: 2,
      tags: [],
      image: undefined,
      description: '',
      ingredients: [],
    });
    await repos.feedback.add({ mealId: meal.id, rating: 'disliked', ateOn: '2026-08-25' });

    await repos.meals.remove(meal.id);

    expect(await repos.feedback.list(meal.id)).toEqual([]);
  });

  it('imports order history lines and lists them newest-first', async () => {
    await repos.orderHistory.importLines([
      { retailer: 'new-world', name: 'Anchor Blue Milk 2L', quantity: 1, unit: 'ea', totalPrice: 4.5, orderedOn: '2026-08-01' },
      { retailer: 'new-world', name: 'Weet-Bix 750g', quantity: 1, unit: 'ea', unitPrice: 5.79, totalPrice: 5.79, orderedOn: '2026-08-08' },
    ]);
    const history = await repos.orderHistory.list();
    expect(history).toHaveLength(2);
    expect(history[0]?.name).toBe('Weet-Bix 750g');
    expect(history[0]?.unitPrice).toBe(5.79);
    expect(history[1]?.name).toBe('Anchor Blue Milk 2L');
    expect(history[1]?.unitPrice).toBeUndefined();
  });

  it('matches an unmatched order line to a cached New World product above the confidence bar, and never twice', async () => {
    await shoppingProducts.saveProduct({
      retailer: 'new-world',
      externalProductId: 'integration-weetbix-750g',
      name: 'Weet-Bix 750g',
      productUrl: 'https://www.newworld.co.nz/shop/product/integration-weetbix-750g',
      availability: 'available',
    });

    const { matched, total } = await repos.orderHistory.matchToCatalogue();
    expect(matched).toBeGreaterThanOrEqual(1);
    expect(total).toBeGreaterThanOrEqual(1);

    const history = await repos.orderHistory.list();
    const weetbix = history.find((line) => line.name === 'Weet-Bix 750g');
    expect(weetbix?.matchedProductName).toBe('Weet-Bix 750g');
    expect(weetbix?.matchedProductId).toBeTruthy();

    // Re-running finds nothing new to match — the line is already linked.
    const second = await repos.orderHistory.matchToCatalogue();
    expect(second.matched).toBe(0);
  });

  it('matches an invoice-printed name with a space against a catalogue name with none', async () => {
    // The real bug this pins: New World's own product name glues the size on ("Milk3l"), but a
    // PDF invoice prints it with a space ("Milk 3l"). Same product, different literal string.
    await shoppingProducts.saveProduct({
      retailer: 'new-world',
      externalProductId: 'integration-pams-standard-milk-3l',
      name: 'Pams Standard Milk3l',
      productUrl: 'https://www.newworld.co.nz/shop/product/integration-pams-standard-milk-3l',
      availability: 'available',
    });
    await repos.orderHistory.importLines([
      { retailer: 'new-world', name: 'Pams Standard Milk 3l', quantity: 1, unit: 'ea', totalPrice: 7.65, orderedOn: '2026-08-15' },
    ]);

    await repos.orderHistory.matchToCatalogue();

    const history = await repos.orderHistory.list();
    const milk = history.find((line) => line.name === 'Pams Standard Milk 3l');
    expect(milk?.matchedProductName).toBe('Pams Standard Milk3l');
  });
});
