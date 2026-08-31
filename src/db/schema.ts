import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { MealIngredient } from '@/domain/schemas/meal';

/**
 * Stage 2 database schema (ADR-013).
 *
 * **Every table has RLS enabled and no policies** (ADR-016). That is a deliberate deny-all,
 * not an unfinished state: the application's own queries run as `postgres`, which owns these
 * tables and bypasses RLS, so the wall is around the publishable key — a credential that is
 * public by design and would otherwise read and write every row through Supabase's REST API.
 * Policies arrive with authentication, to grant the `authenticated` role access to its own
 * household. Until then, granting nothing is exactly right.
 *
 * Every table mirrors a Zod schema in `src/domain/schemas`. The Zod schemas remain
 * the source of truth for validation (section 5); this file is the source of truth
 * for storage. Where the two disagree the repository layer maps between them —
 * see the `price` and `note` notes below.
 *
 * `households` is the tenant root. Every row in every other table carries a
 * `household_id`, indexed, so that RLS policies can be a single predicate per table
 * when authentication lands.
 */

/* -------------------------------------------------------------------------- */
/* Enums — kept byte-identical to the Zod `z.enum` options.                    */
/* -------------------------------------------------------------------------- */

export const categoryEnum = pgEnum('category', [
  'Fruit & Vegetables',
  'Meat & Seafood',
  'Dairy',
  'Bakery',
  'Pantry',
  'Frozen',
  'Drinks',
  'Snacks',
  'Household',
]);

export const stockStateEnum = pgEnum('stock_state', ['good', 'low', 'out', 'soon']);

export const dayKeyEnum = pgEnum('day_key', ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

export const slotEnum = pgEnum('slot', ['breakfast', 'lunch', 'dinner']);

export const memberRoleEnum = pgEnum('member_role', ['Adult', 'Child']);

export const memberColourEnum = pgEnum('member_colour', [
  'bg-moss-600',
  'bg-moss-400',
  'bg-clay-500',
  'bg-honey-500',
  'bg-berry-500',
]);

export const mealTagEnum = pgEnum('meal_tag', ['Quick', 'Kids', 'Budget', 'Favourite', 'Weekend']);

/** What happened to a pantry item. `consumed` is reserved for Stage 4's usage tracking. */
export const inventoryEventKindEnum = pgEnum('inventory_event_kind', [
  'created',
  'adjusted',
  'updated',
  'removed',
]);

/** Deliberately four coarse steps. A five-star scale invites precision nobody has. */
export const mealRatingEnum = pgEnum('meal_rating', ['loved', 'liked', 'ok', 'disliked']);

/** Where a school notification came from. `manual` covers hand-entered/pasted items. */
export const schoolNotificationProviderEnum = pgEnum('school_notification_provider', [
  'hero-email',
  'manual',
]);

/** What kind of response a notification is asking the family for, if any. */
export const schoolNotificationActionTypeEnum = pgEnum('school_notification_action_type', [
  'permission',
  'payment',
  'rsvp',
  'reminder',
  'info',
]);

/** What the shopping list's "+" button opens by default (see `settingsSchema`). */
export const shoppingAddModeEnum = pgEnum('shopping_add_mode', ['new-world', 'manual']);

/* -------------------------------------------------------------------------- */
/* Households                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * `Settings` is one-to-one with the household, so it is folded into this table
 * rather than given a second table that could only ever hold a single row.
 */
export const households = pgTable('households', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  shopLabel: text('shop_label').notNull().default(''),
  currency: text('currency').notNull().default('NZD'),
  /** Integer cents; NULL means no weekly target has been configured. */
  weeklyBudgetCents: integer('weekly_budget_cents'),
  pinDemoDate: boolean('pin_demo_date').notNull().default(false),
  /**
   * Only meaningful while `pin_demo_date` is true (ADR-005), but NOT NULL because
   * `settingsSchema.pinnedDate` is a required string — the seed defaults it to today.
   * A nullable column would force the repository to invent a date on every read.
   */
  pinnedDate: date('pinned_date')
    .notNull()
    .default(sql`CURRENT_DATE`),
  showBreakfastAndLunch: boolean('show_breakfast_and_lunch').notNull().default(false),
  /** Off by default — see `settingsSchema.newWorldEnabled`. */
  newWorldEnabled: boolean('new_world_enabled').notNull().default(false),
  shoppingAddMode: shoppingAddModeEnum('shopping_add_mode').notNull().default('new-world'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const householdMembers = pgTable(
  'household_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Derived from the name by the domain layer, stored so display stays cheap. */
    initials: text('initials').notNull(),
    role: memberRoleEnum('role').notNull(),
    colour: memberColourEnum('colour').notNull(),
    /**
     * The Supabase Auth user this family member signs in as, if any (ADR-017).
     *
     * Nullable because most members never sign in — the children have profiles on the
     * dashboard, not logins — and unique because one login is one person. This column is
     * how a request becomes a household: session user → member row → `household_id`.
     *
     * Deliberately NOT a foreign key to `auth.users`. That table lives in Supabase's own
     * schema, and pointing Drizzle's migrations at it couples this schema to Supabase's
     * internals for no gain; the link is enforced by `npm run db:claim`, which checks the
     * user exists before writing.
     */
    userId: uuid('user_id').unique(),
    /**
     * Free-text school name, `Child` members only. Least-data principle (CLAUDE.md): this is
     * the one piece of school context the dashboard actually needs — enough to label whose
     * notifications are whose, nothing that identifies the child to a third party.
     */
    school: text('school'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdIdx: index('household_members_household_idx').on(table.householdId),
  }),
).enableRLS();

/* -------------------------------------------------------------------------- */
/* Pantry                                                                      */
/* -------------------------------------------------------------------------- */

export const pantryItems = pgTable(
  'pantry_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: categoryEnum('category').notNull(),
    quantity: smallint('quantity').notNull().default(0),
    unit: text('unit').notNull(),
    state: stockStateEnum('state').notNull(),
    /** Zod models an absent note as `undefined`; storage uses NULL. Mapped in the repository. */
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /** Covers both the tenant filter and the list's created-at ordering. */
    householdIdx: index('pantry_items_household_idx').on(table.householdId, table.createdAt),
  }),
).enableRLS();

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    brand: text('brand').notNull().default(''),
    size: text('size').notNull().default(''),
    category: categoryEnum('category').notNull(),
    /**
     * Integer cents, not a decimal. Section 5 anticipated this ("Stage 2 may move to
     * integer cents"); `numeric` would come back from the driver as a string and need
     * mapping anyway, so cents costs nothing extra and removes the rounding question.
     * The repository divides by 100 to satisfy `priceSchema`, which stays a number.
     */
    priceCents: integer('price_cents').notNull().default(0),
    defaultQuantity: smallint('default_quantity').notNull().default(1),
    unit: text('unit').notNull(),
    favourite: boolean('favourite').notNull().default(false),
    timesBought: integer('times_bought').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdIdx: index('products_household_idx').on(table.householdId, table.createdAt),
  }),
).enableRLS();

/* -------------------------------------------------------------------------- */
/* Shopping                                                                    */
/* -------------------------------------------------------------------------- */

export const shoppingItems = pgTable(
  'shopping_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: categoryEnum('category').notNull(),
    quantity: smallint('quantity').notNull().default(1),
    unit: text('unit').notNull(),
    /** Integer cents — see `products.priceCents`. */
    priceCents: integer('price_cents').notNull().default(0),
    priority: boolean('priority').notNull().default(false),
    note: text('note'),
    checked: boolean('checked').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdIdx: index('shopping_items_household_idx').on(table.householdId, table.createdAt),
  }),
).enableRLS();

/* -------------------------------------------------------------------------- */
/* Stage 5 retailer product memory                                             */
/* -------------------------------------------------------------------------- */

export const retailerProducts = pgTable(
  'retailer_products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
    retailer: text('retailer').notNull(),
    storeId: text('store_id'),
    externalProductId: text('external_product_id'),
    name: text('name').notNull(),
    brand: text('brand'),
    size: text('size'),
    unit: text('unit'),
    priceCents: integer('price_cents'),
    specialPriceCents: integer('special_price_cents'),
    productUrl: text('product_url'),
    imageUrl: text('image_url'),
    availability: text('availability').notNull().default('unknown'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdIdx: index('retailer_products_household_idx').on(table.householdId, table.retailer),
    externalIdx: uniqueIndex('retailer_products_external_idx').on(
      table.householdId,
      table.retailer,
      table.storeId,
      table.externalProductId,
    ),
  }),
).enableRLS();

export const shoppingProductPreferences = pgTable(
  'shopping_product_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
    shoppingItemKey: text('shopping_item_key').notNull(),
    retailer: text('retailer').notNull(),
    storeId: text('store_id'),
    retailerProductId: uuid('retailer_product_id').references(() => retailerProducts.id, { onDelete: 'set null' }),
    externalProductId: text('external_product_id'),
    productName: text('product_name').notNull(),
    brand: text('brand'),
    size: text('size'),
    productUrl: text('product_url'),
    defaultQuantity: smallint('default_quantity').notNull().default(1),
    confidenceBasisPoints: smallint('confidence_basis_points').notNull().default(10000),
    enabled: boolean('enabled').notNull().default(true),
    lastConfirmedAt: timestamp('last_confirmed_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdIdx: index('shopping_product_preferences_household_idx').on(table.householdId),
    itemRetailerIdx: uniqueIndex('shopping_product_preferences_item_retailer_idx').on(
      table.householdId,
      table.shoppingItemKey,
      table.retailer,
      table.storeId,
    ),
  }),
).enableRLS();

export const trolleyJobs = pgTable(
  'trolley_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
    retailer: text('retailer').notNull().default('new-world'),
    status: text('status').notNull().default('pending'),
    items: jsonb('items').$type<import('@/shopping/schemas').TrolleyAddItem[]>().notNull(),
    results: jsonb('results').$type<import('@/shopping/schemas').TrolleyAddResult[]>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({ householdIdx: index('trolley_jobs_household_idx').on(table.householdId, table.status, table.createdAt) }),
).enableRLS();

export const retailerProductSearchJobs = pgTable(
  'retailer_product_search_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
    retailer: text('retailer').notNull().default('new-world'),
    shoppingItemId: text('shopping_item_id').notNull(),
    shoppingItemKey: text('shopping_item_key').notNull(),
    query: text('query').notNull(),
    storeId: text('store_id'),
    status: text('status').notNull().default('pending'),
    products: jsonb('products').$type<import('@/shopping/schemas').RetailerProduct[]>(),
    message: text('message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({ householdIdx: index('retailer_product_search_jobs_household_idx').on(table.householdId, table.status, table.createdAt) }),
).enableRLS();

/**
 * Past retailer orders, imported by pasting an invoice/order confirmation (Stage 5).
 *
 * Append-and-read only, the same shape as `mealFeedback`: a "common order" or a reorder signal
 * needs history that cannot be backfilled, not a record that gets corrected in place. A line
 * imported wrong is deleted and re-imported.
 *
 * **Deliberately has no columns for a customer name, address or phone number.** The importer
 * that produces these rows (`src/domain/services/orderImport.ts`) never reads them out of the
 * pasted text in the first place — this table has nowhere to put them even if it tried to.
 */
export const orderLineItems = pgTable(
  'order_line_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
    retailer: text('retailer').notNull().default('new-world'),
    name: text('name').notNull(),
    quantity: doublePrecision('quantity').notNull(),
    unit: text('unit').notNull(),
    unitPriceCents: integer('unit_price_cents'),
    totalPriceCents: integer('total_price_cents').notNull(),
    orderedOn: date('ordered_on').notNull(),
    /** Best-effort link to the household's New World catalogue cache. Denormalised name survives the product disappearing. */
    matchedProductId: uuid('matched_product_id').references(() => retailerProducts.id, { onDelete: 'set null' }),
    matchedProductName: text('matched_product_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdIdx: index('order_line_items_household_idx').on(table.householdId, table.orderedOn),
  }),
).enableRLS();

/* -------------------------------------------------------------------------- */
/* Meals and the weekly plan                                                   */
/* -------------------------------------------------------------------------- */

export const meals = pgTable(
  'meals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    minutes: smallint('minutes').notNull(),
    serves: smallint('serves').notNull(),
    tags: mealTagEnum('tags').array().notNull().default([]),
    /** Null for meals the family adds themselves — Stage 1 has no image upload. */
    image: text('image'),
    description: text('description').notNull().default(''),
    /** Optional cooking method/steps. Null for meals with none recorded. */
    instructions: text('instructions'),
    /** Stage 1 display/compatibility text; ADR-021 explains why it remains beside JSONB. */
    ingredients: text('ingredients').array().notNull().default([]),
    /** Structured Stage 4 amounts; legacy text stays for display and rollback compatibility. */
    ingredientDetails: jsonb('ingredient_details').$type<MealIngredient[]>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdIdx: index('meals_household_idx').on(table.householdId, table.createdAt),
  }),
).enableRLS();

/**
 * The Stage 1 `Plan` is a nested record of day -> slot -> mealId. Stored as rows,
 * one per filled slot, with (household, day, slot) as the natural key: a slot
 * cannot hold two meals, and a missing row means "not planned".
 *
 * `onDelete: 'cascade'` on `meal_id` is what replaces the hand-written cleanup in
 * `MealsRepository.remove()` — deleting a meal can no longer strand a planned slot.
 */
export const planEntries = pgTable(
  'plan_entries',
  {
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    day: dayKeyEnum('day').notNull(),
    slot: slotEnum('slot').notNull(),
    mealId: uuid('meal_id')
      .notNull()
      .references(() => meals.id, { onDelete: 'cascade' }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.householdId, table.day, table.slot] }),
    /** Makes the cascade from `meals` cheap, and answers "where is this meal planned?". */
    mealIdx: index('plan_entries_meal_idx').on(table.mealId),
  }),
).enableRLS();

/* -------------------------------------------------------------------------- */
/* History — written for later stages to learn from, not read by any screen yet */
/* -------------------------------------------------------------------------- */

/**
 * An append-only record of every change to the pantry.
 *
 * Written automatically by the pantry repository, so it cannot drift from what actually
 * happened by somebody forgetting to log. Nothing updates or deletes a row here: that is what
 * makes it an audit trail rather than a second copy of the pantry.
 *
 * Two decisions make it survive the thing it describes:
 *
 *   - `pantry_item_id` is `ON DELETE SET NULL`, not `CASCADE`. Deleting a pantry item must
 *     not erase the history of it — that is exactly the moment the history becomes useful.
 *   - `item_name` is denormalised. Once the item is gone its name is gone too, and
 *     "quantity went from 2 to 0" without a name is not an audit trail.
 *
 * Stage 4 reads this for consumption learning and low-stock prediction.
 */
export const inventoryEvents = pgTable(
  'inventory_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    pantryItemId: uuid('pantry_item_id').references(() => pantryItems.id, {
      onDelete: 'set null',
    }),
    /** Kept even when the item is deleted. See above. */
    itemName: text('item_name').notNull(),
    kind: inventoryEventKindEnum('kind').notNull(),
    /** Signed, for `adjusted`. Null for the others, where a delta means nothing. */
    quantityDelta: integer('quantity_delta'),
    /** The quantity after the change, so a reader never has to replay the whole log. */
    quantityAfter: integer('quantity_after'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /** The query this exists for: "what happened in this household, most recent first". */
    householdIdx: index('inventory_events_household_idx').on(table.householdId, table.createdAt),
  }),
).enableRLS();

/**
 * What the family thought of a meal they ate.
 *
 * Feeds Stage 3's family-feedback learning and Stage 4's consumption learning. Meal detail now
 * records it; the table was created in Stage 2 because retrofitting history is impossible.
 *
 * `member_id` is nullable and `ON DELETE SET NULL`: "the family liked this" is a useful
 * record even when nobody says who, and it must outlive a member leaving the household.
 */
export const mealFeedback = pgTable(
  'meal_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    mealId: uuid('meal_id')
      .notNull()
      .references(() => meals.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id').references(() => householdMembers.id, { onDelete: 'set null' }),
    rating: mealRatingEnum('rating').notNull(),
    note: text('note'),
    /** When it was eaten, not when it was rated — those differ, and the first is the useful one. */
    ateOn: date('ate_on').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    mealIdx: index('meal_feedback_meal_idx').on(table.mealId),
    householdIdx: index('meal_feedback_household_idx').on(table.householdId, table.ateOn),
  }),
).enableRLS();

/* -------------------------------------------------------------------------- */
/* Chores (Phase 12)                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Deliberately minimal (CLAUDE.md: "simple touch completion", not a chore-rotation engine).
 * `assigned_member_id` is nullable and `ON DELETE SET NULL` — an unassigned chore is a normal,
 * expected state, and a chore must outlive the member who used to do it.
 */
export const chores = pgTable(
  'chores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    assignedMemberId: uuid('assigned_member_id').references(() => householdMembers.id, {
      onDelete: 'set null',
    }),
    done: boolean('done').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdIdx: index('chores_household_idx').on(table.householdId, table.createdAt),
  }),
).enableRLS();

/* -------------------------------------------------------------------------- */
/* Kids / School (Phase 12)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A normalised notification surfaced on the Kids/School card — from a Hero email, or entered
 * by hand. Append-and-review, not append-only: `read`/`dismissed` are the only fields a family
 * member ever changes, everything else is what the source said.
 *
 * `child_id` is nullable and `ON DELETE SET NULL` — a notification that couldn't be matched to
 * a specific child (or whose child later leaves the household) is still worth keeping, just
 * unattributed rather than gone.
 *
 * `external_reference` exists for the Hero email provider's idempotency: the same forwarded
 * email must never become two rows if ingestion runs twice.
 */
export const schoolNotifications = pgTable(
  'school_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    childId: uuid('child_id').references(() => householdMembers.id, { onDelete: 'set null' }),
    provider: schoolNotificationProviderEnum('provider').notNull(),
    /** e.g. the source Gmail message id. Null for hand-entered notifications. */
    externalReference: text('external_reference'),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    eventDate: date('event_date'),
    dueDate: date('due_date'),
    actionRequired: boolean('action_required').notNull().default(false),
    actionType: schoolNotificationActionTypeEnum('action_type'),
    /** Deep-link back to Hero/the original source — CLAUDE.md's "link back, don't replace it". */
    sourceLink: text('source_link'),
    /**
     * True when extraction (the Hero-email pipeline) was not confident in the fields above —
     * CLAUDE.md: "Where extraction confidence is low, mark the item for user confirmation
     * rather than guessing." Always false for hand-entered notifications, which are already
     * exactly what a person typed.
     */
    needsReview: boolean('needs_review').notNull().default(false),
    read: boolean('read').notNull().default(false),
    dismissed: boolean('dismissed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdIdx: index('school_notifications_household_idx').on(table.householdId, table.receivedAt),
    /** One row per source email, even if ingestion is retried. Null reference never collides. */
    externalRefIdx: uniqueIndex('school_notifications_external_ref_idx').on(
      table.householdId,
      table.provider,
      table.externalReference,
    ),
  }),
).enableRLS();
