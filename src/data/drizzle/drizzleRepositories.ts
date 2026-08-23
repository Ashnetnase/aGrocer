import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { HouseholdMemberDraft, Settings } from '@/domain/schemas/household';
import type { MealDraft } from '@/domain/schemas/meal';
import type { PantryItemDraft, PantryItemPatch } from '@/domain/schemas/pantry';
import type { ProductPatch } from '@/domain/schemas/product';
import type { ShoppingItemDraft, ShoppingItemPatch } from '@/domain/schemas/shopping';
import type { DayKey, Slot } from '@/domain/schemas/common';
import { initialsOf } from '@/domain/services/household';
import type {
  AgrocerRepositories,
  HouseholdRepository,
  MealsRepository,
  PantryRepository,
  ProductsRepository,
  ShoppingRepository,
} from '@/data/repositories/types';
import type { Database } from '@/db/client';
import {
  households,
  householdMembers,
  meals,
  pantryItems,
  planEntries,
  products,
  shoppingItems,
} from '@/db/schema';
import {
  priceToCents,
  toHousehold,
  toHouseholdMember,
  toMeal,
  toPantryItem,
  toPlan,
  toProduct,
  toSettings,
  toShoppingItem,
} from '@/db/mappers';

/**
 * Stage 2 repository implementation, backed by Supabase Postgres (ADR-013).
 *
 * Satisfies exactly the same contracts as `localRepositories`, so swapping them is
 * a one-line change at `AgrocerProvider` and no component moves (ADR-003).
 *
 * Two behaviours are inherited deliberately from Stage 1:
 *
 *   - lists are newest-first, because the localStorage implementation prepended
 *   - adding a shopping item whose name matches an unchecked one merges quantities
 *
 * The scoping rule for this whole module: every statement filters or sets
 * `household_id`. Once RLS lands it becomes belt and braces rather than the only
 * thing standing between two households' data.
 */
export function createDrizzleRepositories(db: Database, householdId: string): AgrocerRepositories {
  const pantry: PantryRepository = {
    async list() {
      const rows = await db
        .select()
        .from(pantryItems)
        .where(eq(pantryItems.householdId, householdId))
        .orderBy(desc(pantryItems.createdAt));
      return rows.map(toPantryItem);
    },

    async create(draft: PantryItemDraft) {
      const [row] = await db
        .insert(pantryItems)
        .values({ ...draft, householdId, note: draft.note ?? null })
        .returning();
      if (!row) throw new Error('Insert returned no pantry row');
      return toPantryItem(row);
    },

    async update(id: string, patch: PantryItemPatch) {
      const [row] = await db
        .update(pantryItems)
        .set({ ...patch, ...(patch.note === undefined ? {} : { note: patch.note ?? null }), updatedAt: new Date() })
        .where(and(eq(pantryItems.id, id), eq(pantryItems.householdId, householdId)))
        .returning();
      return row ? toPantryItem(row) : undefined;
    },

    async adjustQuantity(id: string, delta: number) {
      // Done in SQL so two devices adjusting at once cannot lose an increment,
      // which a read-modify-write round trip would allow.
      const [row] = await db
        .update(pantryItems)
        .set({
          quantity: sql`GREATEST(0, LEAST(999, ${pantryItems.quantity} + ${delta}))`,
          updatedAt: new Date(),
        })
        .where(and(eq(pantryItems.id, id), eq(pantryItems.householdId, householdId)))
        .returning();
      return row ? toPantryItem(row) : undefined;
    },

    async remove(id: string) {
      await db
        .delete(pantryItems)
        .where(and(eq(pantryItems.id, id), eq(pantryItems.householdId, householdId)));
    },
  };

  const shopping: ShoppingRepository = {
    async list() {
      const rows = await db
        .select()
        .from(shoppingItems)
        .where(eq(shoppingItems.householdId, householdId))
        .orderBy(desc(shoppingItems.createdAt));
      return rows.map(toShoppingItem);
    },

    async add(draft: ShoppingItemDraft) {
      const [item] = await shopping.addMany([draft]);
      if (!item) throw new Error('Insert returned no shopping row');
      return item;
    },

    async addMany(drafts: ShoppingItemDraft[]) {
      // One transaction so a partial failure cannot leave half a "add all
      // ingredients" action applied.
      return db.transaction(async (tx) => {
        const added = [];
        for (const draft of drafts) {
          // Case-insensitive, matching `findUncheckedByName` in the domain layer.
          const [existing] = await tx
            .select()
            .from(shoppingItems)
            .where(
              and(
                eq(shoppingItems.householdId, householdId),
                eq(shoppingItems.checked, false),
                sql`lower(${shoppingItems.name}) = lower(${draft.name})`,
              ),
            )
            .limit(1);

          if (existing) {
            const [merged] = await tx
              .update(shoppingItems)
              .set({ quantity: existing.quantity + draft.quantity, updatedAt: new Date() })
              .where(eq(shoppingItems.id, existing.id))
              .returning();
            if (!merged) throw new Error('Merge returned no shopping row');
            added.push(toShoppingItem(merged));
            continue;
          }

          const [row] = await tx
            .insert(shoppingItems)
            .values({
              householdId,
              name: draft.name,
              category: draft.category,
              quantity: draft.quantity,
              unit: draft.unit,
              priceCents: priceToCents(draft.price),
              priority: draft.priority,
              note: draft.note ?? null,
              checked: false,
            })
            .returning();
          if (!row) throw new Error('Insert returned no shopping row');
          added.push(toShoppingItem(row));
        }
        return added;
      });
    },

    async update(id: string, patch: ShoppingItemPatch) {
      const [row] = await db
        .update(shoppingItems)
        .set({
          ...(patch.name === undefined ? {} : { name: patch.name }),
          ...(patch.category === undefined ? {} : { category: patch.category }),
          ...(patch.quantity === undefined ? {} : { quantity: patch.quantity }),
          ...(patch.unit === undefined ? {} : { unit: patch.unit }),
          ...(patch.price === undefined ? {} : { priceCents: priceToCents(patch.price) }),
          ...(patch.priority === undefined ? {} : { priority: patch.priority }),
          ...(patch.note === undefined ? {} : { note: patch.note ?? null }),
          updatedAt: new Date(),
        })
        .where(and(eq(shoppingItems.id, id), eq(shoppingItems.householdId, householdId)))
        .returning();
      return row ? toShoppingItem(row) : undefined;
    },

    async toggle(id: string) {
      const [row] = await db
        .update(shoppingItems)
        .set({ checked: sql`NOT ${shoppingItems.checked}`, updatedAt: new Date() })
        .where(and(eq(shoppingItems.id, id), eq(shoppingItems.householdId, householdId)))
        .returning();
      return row ? toShoppingItem(row) : undefined;
    },

    async remove(id: string) {
      await db
        .delete(shoppingItems)
        .where(and(eq(shoppingItems.id, id), eq(shoppingItems.householdId, householdId)));
    },

    async clearChecked() {
      await db
        .delete(shoppingItems)
        .where(and(eq(shoppingItems.householdId, householdId), eq(shoppingItems.checked, true)));
    },
  };

  const mealsRepo: MealsRepository = {
    async list() {
      const rows = await db
        .select()
        .from(meals)
        .where(eq(meals.householdId, householdId))
        .orderBy(desc(meals.createdAt));
      return rows.map(toMeal);
    },

    async create(draft: MealDraft) {
      const [row] = await db
        .insert(meals)
        .values({ ...draft, householdId, image: draft.image ?? null })
        .returning();
      if (!row) throw new Error('Insert returned no meal row');
      return toMeal(row);
    },

    async update(id: string, draft: MealDraft) {
      const [row] = await db
        .update(meals)
        .set({ ...draft, image: draft.image ?? null, updatedAt: new Date() })
        .where(and(eq(meals.id, id), eq(meals.householdId, householdId)))
        .returning();
      return row ? toMeal(row) : undefined;
    },

    async remove(id: string) {
      // No plan cleanup here: `plan_entries.meal_id` cascades, so the database
      // guarantees what Stage 1 had to remember to do by hand.
      await db.delete(meals).where(and(eq(meals.id, id), eq(meals.householdId, householdId)));
    },

    async getPlan() {
      const rows = await db
        .select()
        .from(planEntries)
        .where(eq(planEntries.householdId, householdId))
        .orderBy(asc(planEntries.day));
      return toPlan(rows);
    },

    async assign(day: DayKey, slot: Slot, mealId: string) {
      await db
        .insert(planEntries)
        .values({ householdId, day, slot, mealId })
        .onConflictDoUpdate({
          target: [planEntries.householdId, planEntries.day, planEntries.slot],
          set: { mealId, updatedAt: new Date() },
        });
      return mealsRepo.getPlan();
    },

    async clear(day: DayKey, slot: Slot) {
      await db
        .delete(planEntries)
        .where(
          and(
            eq(planEntries.householdId, householdId),
            eq(planEntries.day, day),
            eq(planEntries.slot, slot),
          ),
        );
      return mealsRepo.getPlan();
    },
  };

  const productsRepo: ProductsRepository = {
    async list() {
      const rows = await db
        .select()
        .from(products)
        .where(eq(products.householdId, householdId))
        .orderBy(desc(products.createdAt));
      return rows.map(toProduct);
    },

    async update(id: string, patch: ProductPatch) {
      const [row] = await db
        .update(products)
        .set({
          ...(patch.name === undefined ? {} : { name: patch.name }),
          ...(patch.brand === undefined ? {} : { brand: patch.brand }),
          ...(patch.size === undefined ? {} : { size: patch.size }),
          ...(patch.category === undefined ? {} : { category: patch.category }),
          ...(patch.price === undefined ? {} : { priceCents: priceToCents(patch.price) }),
          ...(patch.defaultQuantity === undefined ? {} : { defaultQuantity: patch.defaultQuantity }),
          ...(patch.unit === undefined ? {} : { unit: patch.unit }),
          ...(patch.favourite === undefined ? {} : { favourite: patch.favourite }),
          updatedAt: new Date(),
        })
        .where(and(eq(products.id, id), eq(products.householdId, householdId)))
        .returning();
      return row ? toProduct(row) : undefined;
    },

    async toggleFavourite(id: string) {
      const [row] = await db
        .update(products)
        .set({ favourite: sql`NOT ${products.favourite}`, updatedAt: new Date() })
        .where(and(eq(products.id, id), eq(products.householdId, householdId)))
        .returning();
      return row ? toProduct(row) : undefined;
    },
  };

  const household: HouseholdRepository = {
    async get() {
      const [row] = await db.select().from(households).where(eq(households.id, householdId));
      if (!row) throw new Error(`Household ${householdId} not found`);
      const memberRows = await db
        .select()
        .from(householdMembers)
        .where(eq(householdMembers.householdId, householdId))
        .orderBy(asc(householdMembers.createdAt));
      return toHousehold(row, memberRows);
    },

    async addMember(draft: HouseholdMemberDraft) {
      const [row] = await db
        .insert(householdMembers)
        .values({ ...draft, householdId, initials: initialsOf(draft.name) })
        .returning();
      if (!row) throw new Error('Insert returned no member row');
      return toHouseholdMember(row);
    },

    async updateMember(id: string, draft: HouseholdMemberDraft) {
      const [row] = await db
        .update(householdMembers)
        .set({ ...draft, initials: initialsOf(draft.name) })
        .where(and(eq(householdMembers.id, id), eq(householdMembers.householdId, householdId)))
        .returning();
      return row ? toHouseholdMember(row) : undefined;
    },

    async removeMember(id: string) {
      await db
        .delete(householdMembers)
        .where(and(eq(householdMembers.id, id), eq(householdMembers.householdId, householdId)));
    },

    async updateSettings(patch: Partial<Settings>) {
      const [row] = await db
        .update(households)
        .set({
          ...(patch.householdName === undefined ? {} : { name: patch.householdName }),
          ...(patch.shopLabel === undefined ? {} : { shopLabel: patch.shopLabel }),
          ...(patch.pinDemoDate === undefined ? {} : { pinDemoDate: patch.pinDemoDate }),
          ...(patch.pinnedDate === undefined ? {} : { pinnedDate: patch.pinnedDate }),
          ...(patch.showBreakfastAndLunch === undefined
            ? {}
            : { showBreakfastAndLunch: patch.showBreakfastAndLunch }),
          updatedAt: new Date(),
        })
        .where(eq(households.id, householdId))
        .returning();
      if (!row) throw new Error(`Household ${householdId} not found`);
      return toSettings(row);
    },
  };

  return {
    pantry,
    shopping,
    meals: mealsRepo,
    products: productsRepo,
    household,

    /**
     * Stage 1's `reset()` wiped localStorage. There is no safe equivalent against a
     * shared database — it would delete the family's real data — so it is refused.
     * Re-seeding belongs in a deliberate script, not a method any screen can call.
     */
    async reset() {
      throw new Error(
        'reset() is not supported against the database. Use a seed script deliberately instead.',
      );
    },
  };
}
