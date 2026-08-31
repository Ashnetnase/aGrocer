import type { Household, HouseholdMember, Settings } from '@/domain/schemas/household';
import type { Meal, Plan } from '@/domain/schemas/meal';
import type { PantryItem } from '@/domain/schemas/pantry';
import type { Product } from '@/domain/schemas/product';
import type { ShoppingItem } from '@/domain/schemas/shopping';
import type { MealFeedback } from '@/domain/schemas/feedback';
import type { OrderLineItem } from '@/domain/schemas/orderHistory';
import type { SchoolNotification } from '@/domain/schemas/school';
import type {
  households,
  householdMembers,
  meals,
  pantryItems,
  mealFeedback,
  orderLineItems,
  planEntries,
  products,
  schoolNotifications,
  shoppingItems,
} from './schema';

/**
 * Row <-> domain mapping (ADR-013).
 *
 * The storage schema and the Zod domain schemas disagree in exactly three ways,
 * and every one of them is resolved here rather than leaking into components:
 *
 *   1. money is stored as integer cents, but `priceSchema` is a plain number
 *   2. optional text is NULL in storage but `undefined` in the domain
 *   3. the weekly plan is rows in storage but a nested record in the domain
 *
 * These functions are pure, which is what makes them testable without a database.
 */

type HouseholdRow = typeof households.$inferSelect;
type HouseholdMemberRow = typeof householdMembers.$inferSelect;
type PantryItemRow = typeof pantryItems.$inferSelect;
type ProductRow = typeof products.$inferSelect;
type ShoppingItemRow = typeof shoppingItems.$inferSelect;
type MealRow = typeof meals.$inferSelect;
type PlanEntryRow = typeof planEntries.$inferSelect;
type MealFeedbackRow = typeof mealFeedback.$inferSelect;
type OrderLineItemRow = typeof orderLineItems.$inferSelect;
type SchoolNotificationRow = typeof schoolNotifications.$inferSelect;

/* -------------------------------------------------------------------------- */
/* Money                                                                       */
/* -------------------------------------------------------------------------- */

/** Cents to NZD. `priceSchema` allows two decimal places, so this never rounds. */
export function centsToPrice(cents: number): number {
  return cents / 100;
}

/**
 * NZD to cents. Rounds, because floating point means `19.99 * 100` is
 * 1998.9999999999998 and truncating would quietly lose a cent on many prices.
 */
export function priceToCents(price: number): number {
  return Math.round(price * 100);
}

/** NULL is how storage spells the domain's `undefined`. */
function optionalText(value: string | null): string | undefined {
  return value ?? undefined;
}

/* -------------------------------------------------------------------------- */
/* Entities                                                                    */
/* -------------------------------------------------------------------------- */

export function toPantryItem(row: PantryItemRow): PantryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    state: row.state,
    note: optionalText(row.note),
  };
}

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    size: row.size,
    category: row.category,
    price: centsToPrice(row.priceCents),
    defaultQuantity: row.defaultQuantity,
    unit: row.unit,
    favourite: row.favourite,
    timesBought: row.timesBought,
  };
}

export function toShoppingItem(row: ShoppingItemRow): ShoppingItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    price: centsToPrice(row.priceCents),
    priority: row.priority,
    note: optionalText(row.note),
    checked: row.checked,
  };
}

export function toMeal(row: MealRow): Meal {
  return {
    id: row.id,
    name: row.name,
    minutes: row.minutes,
    serves: row.serves,
    tags: row.tags,
    image: optionalText(row.image),
    description: row.description,
    instructions: optionalText(row.instructions),
    ingredients: row.ingredients,
    ingredientDetails: row.ingredientDetails ?? undefined,
  };
}

export function toSettings(row: HouseholdRow): Settings {
  return {
    householdName: row.name,
    shopLabel: row.shopLabel,
    // `currency` is `z.literal('NZD')`. The column is free text so a later
    // multi-currency change is a migration rather than a schema rewrite.
    currency: 'NZD',
    weeklyBudget:
      row.weeklyBudgetCents === null ? null : centsToPrice(row.weeklyBudgetCents),
    pinDemoDate: row.pinDemoDate,
    pinnedDate: row.pinnedDate,
    showBreakfastAndLunch: row.showBreakfastAndLunch,
  };
}

export function toHouseholdMember(row: HouseholdMemberRow): HouseholdMember {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    role: row.role,
    colour: row.colour,
    school: row.school,
  };
}

export function toHousehold(row: HouseholdRow, memberRows: HouseholdMemberRow[]): Household {
  return {
    members: memberRows.map(toHouseholdMember),
    settings: toSettings(row),
  };
}

/**
 * Plan rows to the nested day -> slot -> mealId record the UI expects.
 * A day with no planned slots is simply absent, matching the Stage 1 shape.
 */
export function toPlan(rows: PlanEntryRow[]): Plan {
  const plan: Plan = {};
  for (const row of rows) {
    plan[row.day] = { ...plan[row.day], [row.slot]: row.mealId };
  }
  return plan;
}

/**
 * `ate_on` is a Postgres `date`, which the driver hands back as a `yyyy-mm-dd` string — no
 * timezone, which is right: a dinner belongs to a calendar day, not an instant. `created_at`
 * is a real timestamp and becomes ISO.
 */
export function toMealFeedback(row: MealFeedbackRow): MealFeedback {
  return {
    id: row.id,
    mealId: row.mealId,
    memberId: row.memberId ?? undefined,
    rating: row.rating,
    note: optionalText(row.note),
    ateOn: row.ateOn,
    createdAt: row.createdAt.toISOString(),
  };
}

/** `ordered_on` is a Postgres `date`; the driver hands it back as `yyyy-mm-dd` already. */
export function toOrderLineItem(row: OrderLineItemRow): OrderLineItem {
  return {
    id: row.id,
    retailer: row.retailer as OrderLineItem['retailer'],
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unitPriceCents === null ? undefined : centsToPrice(row.unitPriceCents),
    totalPrice: centsToPrice(row.totalPriceCents),
    orderedOn: row.orderedOn,
    matchedProductId: row.matchedProductId ?? undefined,
    matchedProductName: optionalText(row.matchedProductName),
  };
}

export function toSchoolNotification(row: SchoolNotificationRow): SchoolNotification {
  return {
    id: row.id,
    childId: row.childId,
    provider: row.provider,
    externalReference: row.externalReference,
    title: row.title,
    summary: row.summary,
    receivedAt: row.receivedAt.toISOString(),
    eventDate: row.eventDate,
    dueDate: row.dueDate,
    actionRequired: row.actionRequired,
    actionType: row.actionType,
    sourceLink: row.sourceLink,
    read: row.read,
    dismissed: row.dismissed,
  };
}
