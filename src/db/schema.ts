import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Stage 2 database schema (ADR-013).
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
  pinDemoDate: boolean('pin_demo_date').notNull().default(false),
  /** Only meaningful while `pin_demo_date` is true (ADR-005). */
  pinnedDate: date('pinned_date'),
  showBreakfastAndLunch: boolean('show_breakfast_and_lunch').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdIdx: index('household_members_household_idx').on(table.householdId),
  }),
);

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
);

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
);

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
);

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
    /**
     * Stage 1 ingredients are free text, so an array column matches the domain exactly.
     * A structured `meal_ingredients` table becomes worthwhile in Stage 4, when
     * pantry-to-recipe matching needs to join on them.
     */
    ingredients: text('ingredients').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdIdx: index('meals_household_idx').on(table.householdId, table.createdAt),
  }),
);

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
);
