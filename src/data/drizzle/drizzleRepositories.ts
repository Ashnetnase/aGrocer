import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import type { HouseholdMemberDraft, Settings } from '@/domain/schemas/household';
import type { MealDraft } from '@/domain/schemas/meal';
import type { PantryItemDraft, PantryItemPatch } from '@/domain/schemas/pantry';
import type { ProductPatch } from '@/domain/schemas/product';
import type { ShoppingItemDraft, ShoppingItemPatch } from '@/domain/schemas/shopping';
import type { DayKey, Slot } from '@/domain/schemas/common';
import { initialsOf } from '@/domain/services/household';
import type {
  AgrocerRepositories,
  FeedbackRepository,
  HouseholdRepository,
  MealsRepository,
  OrderHistoryRepository,
  PantryRepository,
  ProductsRepository,
  SchoolRepository,
  ShoppingRepository,
} from '@/data/repositories/types';
import type { Database } from '@/db/client';
import {
  households,
  householdMembers,
  meals,
  inventoryEvents,
  mealFeedback,
  orderLineItems,
  pantryItems,
  planEntries,
  products,
  retailerProducts,
  schoolNotifications,
  shoppingItems,
} from '@/db/schema';
import {
  priceToCents,
  toHousehold,
  toHouseholdMember,
  toMeal,
  toMealFeedback,
  toOrderLineItem,
  toPantryItem,
  toPlan,
  toProduct,
  toSchoolNotification,
  toSettings,
  toShoppingItem,
} from '@/db/mappers';
import { isSpecificNewWorldProduct, rankProduct } from '@/shopping/matching';
import { toProduct as toRetailerProduct } from '@/shopping/repository';

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
  /**
   * Appends to the pantry audit trail.
   *
   * Called from inside the repository rather than from the route handlers, so the log cannot
   * drift from reality by somebody forgetting to write one. It never throws: an audit trail
   * that can fail a user's pantry update is worse than a gap in the audit trail, so a failure
   * is logged and swallowed.
   */
  async function recordInventoryEvent(event: {
    pantryItemId: string | null;
    itemName: string;
    kind: 'created' | 'adjusted' | 'updated' | 'removed';
    quantityDelta?: number;
    quantityAfter?: number;
  }): Promise<void> {
    try {
      await db.insert(inventoryEvents).values({
        householdId,
        pantryItemId: event.pantryItemId,
        itemName: event.itemName,
        kind: event.kind,
        quantityDelta: event.quantityDelta ?? null,
        quantityAfter: event.quantityAfter ?? null,
      });
    } catch (error) {
      console.error('[inventory-events] could not record', event.kind, event.itemName, error);
    }
  }

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
      await recordInventoryEvent({
        pantryItemId: row.id,
        itemName: row.name,
        kind: 'created',
        quantityAfter: row.quantity,
      });
      return toPantryItem(row);
    },

    async update(id: string, patch: PantryItemPatch) {
      const [row] = await db
        .update(pantryItems)
        .set({ ...patch, ...(patch.note === undefined ? {} : { note: patch.note ?? null }), updatedAt: new Date() })
        .where(and(eq(pantryItems.id, id), eq(pantryItems.householdId, householdId)))
        .returning();
      if (row) {
        await recordInventoryEvent({
          pantryItemId: row.id,
          itemName: row.name,
          kind: 'updated',
          quantityAfter: row.quantity,
        });
      }
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
      if (row) {
        await recordInventoryEvent({
          pantryItemId: row.id,
          itemName: row.name,
          kind: 'adjusted',
          quantityDelta: delta,
          quantityAfter: row.quantity,
        });
      }
      return row ? toPantryItem(row) : undefined;
    },

    async remove(id: string) {
      // Deleted with `returning()` so the name survives into the event. Without it the audit
      // trail would record that something was removed and be unable to say what.
      const [row] = await db
        .delete(pantryItems)
        .where(and(eq(pantryItems.id, id), eq(pantryItems.householdId, householdId)))
        .returning();
      if (row) {
        await recordInventoryEvent({
          // The row is gone, so the foreign key must be null — the event outlives the item.
          pantryItemId: null,
          itemName: row.name,
          kind: 'removed',
          quantityAfter: 0,
        });
      }
    },
  };

  const feedback: FeedbackRepository = {
    async list(mealId?: string) {
      const rows = await db
        .select()
        .from(mealFeedback)
        .where(
          mealId
            ? and(eq(mealFeedback.householdId, householdId), eq(mealFeedback.mealId, mealId))
            : eq(mealFeedback.householdId, householdId),
        )
        .orderBy(desc(mealFeedback.ateOn), desc(mealFeedback.createdAt));
      return rows.map(toMealFeedback);
    },

    async add(draft) {
      const [row] = await db
        .insert(mealFeedback)
        .values({
          householdId,
          mealId: draft.mealId,
          memberId: draft.memberId ?? null,
          rating: draft.rating,
          note: draft.note ?? null,
          ateOn: draft.ateOn,
        })
        .returning();
      if (!row) throw new Error('Insert returned no feedback row');
      return toMealFeedback(row);
    },
  };

  const school: SchoolRepository = {
    async list() {
      const rows = await db
        .select()
        .from(schoolNotifications)
        .where(eq(schoolNotifications.householdId, householdId))
        .orderBy(desc(schoolNotifications.receivedAt));
      return rows.map(toSchoolNotification);
    },

    async add(draft) {
      const [row] = await db
        .insert(schoolNotifications)
        .values({
          householdId,
          childId: draft.childId,
          provider: draft.provider,
          externalReference: draft.externalReference,
          title: draft.title,
          summary: draft.summary,
          receivedAt: draft.receivedAt ? new Date(draft.receivedAt) : new Date(),
          eventDate: draft.eventDate,
          dueDate: draft.dueDate,
          actionRequired: draft.actionRequired,
          actionType: draft.actionType,
          sourceLink: draft.sourceLink,
        })
        // Same forwarded email ingested twice must not become two rows (see schema comment).
        .onConflictDoNothing({
          target: [
            schoolNotifications.householdId,
            schoolNotifications.provider,
            schoolNotifications.externalReference,
          ],
        })
        .returning();
      if (row) return toSchoolNotification(row);

      const [existing] = await db
        .select()
        .from(schoolNotifications)
        .where(
          and(
            eq(schoolNotifications.householdId, householdId),
            eq(schoolNotifications.provider, draft.provider),
            draft.externalReference
              ? eq(schoolNotifications.externalReference, draft.externalReference)
              : isNull(schoolNotifications.externalReference),
          ),
        );
      if (!existing) throw new Error('Insert returned no school notification row');
      return toSchoolNotification(existing);
    },

    async markRead(id: string, read: boolean) {
      const [row] = await db
        .update(schoolNotifications)
        .set({ read })
        .where(and(eq(schoolNotifications.id, id), eq(schoolNotifications.householdId, householdId)))
        .returning();
      return row ? toSchoolNotification(row) : undefined;
    },

    async dismiss(id: string) {
      const [row] = await db
        .update(schoolNotifications)
        .set({ dismissed: true })
        .where(and(eq(schoolNotifications.id, id), eq(schoolNotifications.householdId, householdId)))
        .returning();
      return row ? toSchoolNotification(row) : undefined;
    },
  };

  const orderHistory: OrderHistoryRepository = {
    async list() {
      const rows = await db
        .select()
        .from(orderLineItems)
        .where(eq(orderLineItems.householdId, householdId))
        .orderBy(desc(orderLineItems.orderedOn), desc(orderLineItems.createdAt));
      return rows.map(toOrderLineItem);
    },

    async importLines(drafts) {
      if (!drafts.length) return [];
      const rows = await db
        .insert(orderLineItems)
        .values(
          drafts.map((draft) => ({
            householdId,
            retailer: draft.retailer,
            name: draft.name,
            quantity: draft.quantity,
            unit: draft.unit,
            unitPriceCents: draft.unitPrice === undefined ? null : priceToCents(draft.unitPrice),
            totalPriceCents: priceToCents(draft.totalPrice),
            orderedOn: draft.orderedOn,
            matchedProductId: draft.matchedProductId ?? null,
            matchedProductName: draft.matchedProductName ?? null,
          })),
        )
        .returning();
      return rows.map(toOrderLineItem);
    },

    // 0.85, not `resolveShoppingItem`'s 0.86 "ready" bar. `rankProduct`'s token-overlap branch
    // tops out at exactly 0.85 for a *perfect* token match (0.35 + 1.0*0.5) — reachable often
    // here because New World's own product names glue a size onto the name ("Milk3l") while an
    // invoice prints it with a space ("Milk 3l"); `rankProduct` splits both consistently once it
    // tokenises, so every token matches, but the exact-string and substring bonuses above that
    // branch never fire for a same-product one-space difference. 0.86 categorically rejects
    // every 100%-token-overlap match, not just risky ones. A one-point-lower bar here (never
    // used for the trolley's auto-add path) is proportionate: this only backfills a metadata
    // link on already-recorded history, not something being added to a real cart unreviewed.
    async matchToCatalogue() {
      const [unmatchedRows, candidateRows] = await Promise.all([
        db.select().from(orderLineItems).where(
          and(eq(orderLineItems.householdId, householdId), isNull(orderLineItems.matchedProductId)),
        ),
        db.select().from(retailerProducts).where(
          and(eq(retailerProducts.householdId, householdId), eq(retailerProducts.retailer, 'new-world')),
        ),
      ]);
      const candidates = candidateRows.map(toRetailerProduct).filter(isSpecificNewWorldProduct);

      const bestMatchByName = new Map<string, { id: string; name: string }>();
      for (const name of new Set(unmatchedRows.map((row) => row.name))) {
        let best: { id: string; name: string; score: number } | undefined;
        for (const candidate of candidates) {
          if (!candidate.id) continue;
          const score = rankProduct(name, candidate);
          if (score >= 0.85 && (!best || score > best.score)) best = { id: candidate.id, name: candidate.name, score };
        }
        if (best) bestMatchByName.set(name, { id: best.id, name: best.name });
      }

      let matched = 0;
      for (const [name, match] of bestMatchByName) {
        const updated = await db
          .update(orderLineItems)
          .set({ matchedProductId: match.id, matchedProductName: match.name })
          .where(and(
            eq(orderLineItems.householdId, householdId),
            eq(orderLineItems.name, name),
            isNull(orderLineItems.matchedProductId),
          ))
          .returning({ id: orderLineItems.id });
        matched += updated.length;
      }

      return { matched, total: unmatchedRows.length };
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
        .values({ ...draft, householdId, image: draft.image ?? null, instructions: draft.instructions ?? null })
        .returning();
      if (!row) throw new Error('Insert returned no meal row');
      return toMeal(row);
    },

    async update(id: string, draft: MealDraft) {
      const [row] = await db
        .update(meals)
        .set({ ...draft, image: draft.image ?? null, instructions: draft.instructions ?? null, updatedAt: new Date() })
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
          ...(patch.weeklyBudget === undefined
            ? {}
            : {
                weeklyBudgetCents:
                  patch.weeklyBudget === null ? null : priceToCents(patch.weeklyBudget),
              }),
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
    inventoryEvents: {
      async list(limit = 200) {
        const rows = await db.select().from(inventoryEvents)
          .where(eq(inventoryEvents.householdId, householdId))
          .orderBy(desc(inventoryEvents.createdAt)).limit(limit);
        return rows.map((row) => ({
          itemName: row.itemName,
          kind: row.kind,
          quantityDelta: row.quantityDelta,
          quantityAfter: row.quantityAfter,
          createdAt: row.createdAt,
        }));
      },
    },
    feedback,
    orderHistory,
    school,
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
