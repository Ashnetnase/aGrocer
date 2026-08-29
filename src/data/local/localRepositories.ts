import { z } from 'zod';
import { householdSchema, type Household, type HouseholdMemberDraft, type Settings } from '@/domain/schemas/household';
import { mealSchema, planSchema, type Meal, type MealDraft, type Plan } from '@/domain/schemas/meal';
import { pantryItemSchema, type PantryItem, type PantryItemDraft, type PantryItemPatch } from '@/domain/schemas/pantry';
import { productSchema, type Product, type ProductPatch } from '@/domain/schemas/product';
import {
  shoppingItemSchema,
  type ShoppingItem,
  type ShoppingItemDraft,
  type ShoppingItemPatch,
} from '@/domain/schemas/shopping';
import type { DayKey, Slot } from '@/domain/schemas/common';
import { adjustQuantity } from '@/domain/services/pantry';
import { findUncheckedByName } from '@/domain/services/shopping';
import { removeMealFromPlan } from '@/domain/services/meals';
import { initialsOf } from '@/domain/services/household';
import { householdSeed } from '@/data/seed/household';
import { mealsSeed, planSeed } from '@/data/seed/meals';
import { pantrySeed } from '@/data/seed/pantry';
import { productsSeed } from '@/data/seed/products';
import { shoppingSeed } from '@/data/seed/shopping';
import type {
  AgrocerRepositories,
  FeedbackRepository,
  HouseholdRepository,
  MealsRepository,
  PantryRepository,
  ProductsRepository,
  ShoppingRepository,
} from '@/data/repositories/types';
import { createId } from './ids';
import { clearAll, readJson, writeJson, STORAGE_KEYS } from './storage';

/**
 * Stage 1 repository implementation: seeded demo data, persisted to
 * localStorage and validated on every read (ADR-003, ADR-004).
 */

const pantryListSchema = z.array(pantryItemSchema);
const shoppingListSchema = z.array(shoppingItemSchema);
const productListSchema = z.array(productSchema);

const mealListSchema = z.array(mealSchema);

const loadPantry = () => readJson(STORAGE_KEYS.pantry, pantryListSchema, pantrySeed);
const loadMeals = () => readJson(STORAGE_KEYS.meals, mealListSchema, mealsSeed);
const loadShopping = () => readJson(STORAGE_KEYS.shopping, shoppingListSchema, shoppingSeed);
const loadPlan = () => readJson(STORAGE_KEYS.plan, planSchema, planSeed);
const loadProducts = () => readJson(STORAGE_KEYS.products, productListSchema, productsSeed);
const loadHousehold = () => readJson(STORAGE_KEYS.household, householdSchema, householdSeed);

const pantry: PantryRepository = {
  async list() {
    return loadPantry();
  },

  async create(draft: PantryItemDraft) {
    const item: PantryItem = { ...draft, id: createId('p') };
    writeJson(STORAGE_KEYS.pantry, [item, ...loadPantry()]);
    return item;
  },

  async update(id: string, patch: PantryItemPatch) {
    const items = loadPantry();
    let updated: PantryItem | undefined;
    const next = items.map((item) => {
      if (item.id !== id) return item;
      updated = { ...item, ...patch };
      return updated;
    });
    if (updated) writeJson(STORAGE_KEYS.pantry, next);
    return updated;
  },

  async adjustQuantity(id: string, delta: number) {
    const items = loadPantry();
    let updated: PantryItem | undefined;
    const next = items.map((item) => {
      if (item.id !== id) return item;
      updated = adjustQuantity(item, delta);
      return updated;
    });
    if (updated) writeJson(STORAGE_KEYS.pantry, next);
    return updated;
  },

  async remove(id: string) {
    writeJson(
      STORAGE_KEYS.pantry,
      loadPantry().filter((item) => item.id !== id),
    );
  },
};

/** Shared merge-or-insert used by both `add` and `addMany`. */
function mergeDraft(items: ShoppingItem[], draft: ShoppingItemDraft): { items: ShoppingItem[]; item: ShoppingItem } {
  const existing = findUncheckedByName(items, draft.name);
  if (existing) {
    const merged: ShoppingItem = { ...existing, quantity: existing.quantity + draft.quantity };
    return {
      items: items.map((item) => (item.id === existing.id ? merged : item)),
      item: merged,
    };
  }
  const item: ShoppingItem = { ...draft, id: createId('s'), checked: false };
  return { items: [item, ...items], item };
}

const shopping: ShoppingRepository = {
  async list() {
    return loadShopping();
  },

  async add(draft: ShoppingItemDraft) {
    const { items, item } = mergeDraft(loadShopping(), draft);
    writeJson(STORAGE_KEYS.shopping, items);
    return item;
  },

  async addMany(drafts: ShoppingItemDraft[]) {
    let items = loadShopping();
    const added: ShoppingItem[] = [];
    for (const draft of drafts) {
      const result = mergeDraft(items, draft);
      items = result.items;
      added.push(result.item);
    }
    writeJson(STORAGE_KEYS.shopping, items);
    return added;
  },

  async update(id: string, patch: ShoppingItemPatch) {
    let updated: ShoppingItem | undefined;
    const next = loadShopping().map((item) => {
      if (item.id !== id) return item;
      updated = { ...item, ...patch };
      return updated;
    });
    if (updated) writeJson(STORAGE_KEYS.shopping, next);
    return updated;
  },

  async toggle(id: string) {
    let updated: ShoppingItem | undefined;
    const next = loadShopping().map((item) => {
      if (item.id !== id) return item;
      updated = { ...item, checked: !item.checked };
      return updated;
    });
    if (updated) writeJson(STORAGE_KEYS.shopping, next);
    return updated;
  },

  async remove(id: string) {
    writeJson(
      STORAGE_KEYS.shopping,
      loadShopping().filter((item) => item.id !== id),
    );
  },

  async clearChecked() {
    writeJson(
      STORAGE_KEYS.shopping,
      loadShopping().filter((item) => !item.checked),
    );
  },
};

const meals: MealsRepository = {
  async list(): Promise<Meal[]> {
    return loadMeals();
  },

  async create(draft: MealDraft) {
    const meal: Meal = { ...draft, id: createId('m') };
    writeJson(STORAGE_KEYS.meals, [meal, ...loadMeals()]);
    return meal;
  },

  async update(id: string, draft: MealDraft) {
    let updated: Meal | undefined;
    const next = loadMeals().map((meal) => {
      if (meal.id !== id) return meal;
      updated = { ...meal, ...draft };
      return updated;
    });
    if (updated) writeJson(STORAGE_KEYS.meals, next);
    return updated;
  },

  async remove(id: string) {
    writeJson(
      STORAGE_KEYS.meals,
      loadMeals().filter((meal) => meal.id !== id),
    );
    // Keep the plan consistent: a deleted meal must not linger as a dangling id.
    writeJson(STORAGE_KEYS.plan, removeMealFromPlan(loadPlan(), id));
  },

  async getPlan() {
    return loadPlan();
  },

  async assign(day: DayKey, slot: Slot, mealId: string) {
    const plan = loadPlan();
    const next: Plan = { ...plan, [day]: { ...plan[day], [slot]: mealId } };
    writeJson(STORAGE_KEYS.plan, next);
    return next;
  },

  async clear(day: DayKey, slot: Slot) {
    const plan = loadPlan();
    const daySlots = { ...plan[day] };
    delete daySlots[slot];
    const next: Plan = { ...plan, [day]: daySlots };
    writeJson(STORAGE_KEYS.plan, next);
    return next;
  },
};

const products: ProductsRepository = {
  async list() {
    return loadProducts();
  },

  async update(id: string, patch: ProductPatch) {
    let updated: Product | undefined;
    const next = loadProducts().map((product) => {
      if (product.id !== id) return product;
      updated = { ...product, ...patch };
      return updated;
    });
    if (updated) writeJson(STORAGE_KEYS.products, next);
    return updated;
  },

  async toggleFavourite(id: string) {
    let updated: Product | undefined;
    const next = loadProducts().map((product) => {
      if (product.id !== id) return product;
      updated = { ...product, favourite: !product.favourite };
      return updated;
    });
    if (updated) writeJson(STORAGE_KEYS.products, next);
    return updated;
  },
};

const household: HouseholdRepository = {
  async get() {
    return loadHousehold();
  },

  async addMember(draft: HouseholdMemberDraft) {
    const current = loadHousehold();
    const member = { ...draft, id: createId('h'), initials: initialsOf(draft.name) };
    const next: Household = { ...current, members: [...current.members, member] };
    writeJson(STORAGE_KEYS.household, next);
    return member;
  },

  async updateMember(id: string, draft: HouseholdMemberDraft) {
    const current = loadHousehold();
    let updated: Household['members'][number] | undefined;
    const members = current.members.map((member) => {
      if (member.id !== id) return member;
      updated = { ...member, ...draft, initials: initialsOf(draft.name) };
      return updated;
    });
    if (updated) writeJson(STORAGE_KEYS.household, { ...current, members });
    return updated;
  },

  async removeMember(id: string) {
    const current = loadHousehold();
    writeJson(STORAGE_KEYS.household, {
      ...current,
      members: current.members.filter((member) => member.id !== id),
    });
  },

  async updateSettings(patch: Partial<Settings>) {
    const current = loadHousehold();
    const settings: Settings = { ...current.settings, ...patch };
    writeJson(STORAGE_KEYS.household, { ...current, settings });
    return settings;
  },
};

/**
 * Feedback history has no localStorage implementation, on purpose.
 *
 * It exists to accumulate a record the household can learn from in Stage 4, and a history
 * kept in one browser's storage is not that — it vanishes with a cleared cache and never
 * agrees between the phone and the wall tablet. Reading returns nothing rather than
 * pretending; writing refuses rather than silently storing something that will be lost.
 */
const feedback: FeedbackRepository = {
  async list() {
    return [];
  },
  async add() {
    throw new Error(
      'Meal feedback needs the database. Set NEXT_PUBLIC_AGROCER_SERVER_DATA="1".',
    );
  },
};

export const localRepositories: AgrocerRepositories = {
  pantry,
  shopping,
  meals,
  products,
  household,
  feedback,
  async reset() {
    clearAll();
  },
};
