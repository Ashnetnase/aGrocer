import { describe, expect, it } from 'vitest';
import { pantryItemSchema } from '@/domain/schemas/pantry';
import { productSchema } from '@/domain/schemas/product';
import { shoppingItemSchema } from '@/domain/schemas/shopping';
import { mealSchema } from '@/domain/schemas/meal';
import { householdSchema } from '@/domain/schemas/household';
import {
  categorySchema,
  dayKeySchema,
  slotSchema,
  stockStateSchema,
} from '@/domain/schemas/common';
import { memberColourSchema, memberRoleSchema } from '@/domain/schemas/household';
import { mealTagSchema } from '@/domain/schemas/meal';
import {
  categoryEnum,
  dayKeyEnum,
  mealTagEnum,
  memberColourEnum,
  memberRoleEnum,
  slotEnum,
  stockStateEnum,
} from './schema';
import {
  centsToPrice,
  priceToCents,
  toHousehold,
  toMeal,
  toPantryItem,
  toPlan,
  toProduct,
  toSettings,
  toShoppingItem,
} from './mappers';

const NOW = new Date('2026-08-23T09:00:00Z');
const HOUSEHOLD_ID = '00000000-0000-4000-8000-000000000001';

describe('enum parity with the domain schemas', () => {
  /**
   * The Postgres enums are hand-written copies of the Zod enums. If the two ever
   * drift, reads start failing at runtime with an unhelpful message — so pin them.
   */
  it.each([
    ['category', categoryEnum.enumValues, categorySchema.options],
    ['stock_state', stockStateEnum.enumValues, stockStateSchema.options],
    ['day_key', dayKeyEnum.enumValues, dayKeySchema.options],
    ['slot', slotEnum.enumValues, slotSchema.options],
    ['member_role', memberRoleEnum.enumValues, memberRoleSchema.options],
    ['member_colour', memberColourEnum.enumValues, memberColourSchema.options],
    ['meal_tag', mealTagEnum.enumValues, mealTagSchema.options],
  ])('%s matches its Zod enum exactly', (_name, pg, zod) => {
    expect([...pg]).toEqual([...zod]);
  });
});

describe('money', () => {
  it('round-trips a price through cents', () => {
    for (const price of [0, 0.05, 1, 4.5, 19.99, 123.45, 9999]) {
      expect(centsToPrice(priceToCents(price))).toBe(price);
    }
  });

  it('does not lose a cent to floating point', () => {
    // 19.99 * 100 is 1998.9999999999998, so truncating would store 1998.
    expect(priceToCents(19.99)).toBe(1999);
    expect(priceToCents(0.29)).toBe(29);
    expect(priceToCents(8.7)).toBe(870);
  });
});

describe('toPantryItem', () => {
  const row = {
    id: '11111111-1111-4111-8111-111111111111',
    householdId: HOUSEHOLD_ID,
    name: 'Milk',
    category: 'Dairy' as const,
    quantity: 2,
    unit: 'bottles',
    state: 'good' as const,
    note: null,
    createdAt: NOW,
    updatedAt: NOW,
  };

  it('maps a NULL note to undefined, not null', () => {
    const item = toPantryItem(row);
    expect(item.note).toBeUndefined();
    expect(pantryItemSchema.parse(item)).toEqual(item);
  });

  it('keeps a present note', () => {
    expect(toPantryItem({ ...row, note: 'Blue top' }).note).toBe('Blue top');
  });

  it('drops storage-only columns from the domain object', () => {
    expect(toPantryItem(row)).not.toHaveProperty('householdId');
    expect(toPantryItem(row)).not.toHaveProperty('createdAt');
  });
});

describe('toProduct', () => {
  const row = {
    id: '22222222-2222-4222-8222-222222222222',
    householdId: HOUSEHOLD_ID,
    name: 'Weet-Bix',
    brand: 'Sanitarium',
    size: '1.2kg',
    category: 'Pantry' as const,
    priceCents: 799,
    defaultQuantity: 1,
    unit: 'box',
    favourite: true,
    timesBought: 12,
    createdAt: NOW,
    updatedAt: NOW,
  };

  it('converts cents to a price the domain schema accepts', () => {
    const product = toProduct(row);
    expect(product.price).toBe(7.99);
    expect(productSchema.parse(product)).toEqual(product);
  });
});

describe('toShoppingItem', () => {
  const row = {
    id: '33333333-3333-4333-8333-333333333333',
    householdId: HOUSEHOLD_ID,
    name: 'Bananas',
    category: 'Fruit & Vegetables' as const,
    quantity: 6,
    unit: 'each',
    priceCents: 350,
    priority: false,
    note: null,
    checked: false,
    createdAt: NOW,
    updatedAt: NOW,
  };

  it('produces a valid domain item', () => {
    const item = toShoppingItem(row);
    expect(item.price).toBe(3.5);
    expect(shoppingItemSchema.parse(item)).toEqual(item);
  });
});

describe('toMeal', () => {
  const row = {
    id: '44444444-4444-4444-8444-444444444444',
    householdId: HOUSEHOLD_ID,
    name: 'Butter chicken',
    minutes: 40,
    serves: 5,
    tags: ['Kids', 'Favourite'] as const,
    image: null,
    description: 'Mild, the children eat it.',
    instructions: null,
    ingredients: ['chicken thighs', 'butter', 'tomato'],
    ingredientDetails: null,
    createdAt: NOW,
    updatedAt: NOW,
  };

  it('maps a NULL image to undefined so the placeholder renders', () => {
    const meal = toMeal({ ...row, tags: [...row.tags] });
    expect(meal.image).toBeUndefined();
    expect(mealSchema.parse(meal)).toEqual(meal);
  });

  it('preserves tag and ingredient arrays', () => {
    const meal = toMeal({ ...row, tags: [...row.tags] });
    expect(meal.tags).toEqual(['Kids', 'Favourite']);
    expect(meal.ingredients).toEqual(['chicken thighs', 'butter', 'tomato']);
  });
});

describe('toPlan', () => {
  const entry = (day: 'mon' | 'tue', slot: 'breakfast' | 'dinner', mealId: string) => ({
    householdId: HOUSEHOLD_ID,
    day,
    slot,
    mealId,
    updatedAt: NOW,
  });

  it('nests rows into day -> slot -> mealId', () => {
    expect(toPlan([entry('mon', 'dinner', 'm1'), entry('tue', 'dinner', 'm2')])).toEqual({
      mon: { dinner: 'm1' },
      tue: { dinner: 'm2' },
    });
  });

  it('merges multiple slots on the same day', () => {
    expect(toPlan([entry('mon', 'dinner', 'm1'), entry('mon', 'breakfast', 'm3')])).toEqual({
      mon: { dinner: 'm1', breakfast: 'm3' },
    });
  });

  it('omits days with nothing planned rather than emitting empty objects', () => {
    const plan = toPlan([entry('mon', 'dinner', 'm1')]);
    expect(Object.keys(plan)).toEqual(['mon']);
    expect(plan.sun).toBeUndefined();
  });

  it('returns an empty plan for no rows', () => {
    expect(toPlan([])).toEqual({});
  });
});

describe('toSettings and toHousehold', () => {
  const householdRow = {
    id: HOUSEHOLD_ID,
    name: 'The Ashfords',
    shopLabel: 'New World Thursday',
    currency: 'NZD',
    weeklyBudgetCents: 25_000,
    pinDemoDate: false,
    pinnedDate: '2026-08-23',
    showBreakfastAndLunch: false,
    createdAt: NOW,
    updatedAt: NOW,
  };

  const memberRow = {
    id: '55555555-5555-4555-8555-555555555555',
    householdId: HOUSEHOLD_ID,
    name: 'Ash',
    initials: 'A',
    role: 'Adult' as const,
    colour: 'bg-moss-600' as const,
    school: null,
    // Most members never sign in, so the unlinked case is the one worth having as the default.
    userId: null,
    createdAt: NOW,
  };

  it('maps the household name onto settings.householdName', () => {
    expect(toSettings(householdRow).householdName).toBe('The Ashfords');
  });

  it('maps the weekly budget from integer cents', () => {
    expect(toSettings(householdRow).weeklyBudget).toBe(250);
    expect(toSettings({ ...householdRow, weeklyBudgetCents: null }).weeklyBudget).toBeNull();
  });

  it('produces a household the domain schema accepts', () => {
    const household = toHousehold(householdRow, [memberRow]);
    expect(householdSchema.parse(household)).toEqual(household);
    expect(household.members).toHaveLength(1);
    expect(household.members[0]?.initials).toBe('A');
  });

  it('handles a household with no members yet', () => {
    expect(toHousehold(householdRow, []).members).toEqual([]);
  });
});
