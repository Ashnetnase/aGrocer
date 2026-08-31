'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DayKey, Slot } from '@/domain/schemas/common';
import type { MealFeedback, MealFeedbackDraft } from '@/domain/schemas/feedback';
import type { OrderLineItem, OrderLineItemDraft } from '@/domain/schemas/orderHistory';
import type { Household, HouseholdMemberDraft, Settings } from '@/domain/schemas/household';
import type { Meal, MealDraft, Plan } from '@/domain/schemas/meal';
import type { PantryItem, PantryItemDraft, PantryItemPatch } from '@/domain/schemas/pantry';
import type { Product } from '@/domain/schemas/product';
import type { ShoppingItem, ShoppingItemDraft, ShoppingItemPatch } from '@/domain/schemas/shopping';
import type { AgrocerRepositories } from '@/data/repositories/types';
import { repositoriesForEnvironment } from '@/data/api/repositories';
import { toIsoDate } from '@/domain/services/dates';

/**
 * Application state, backed by the repository layer.
 *
 * Starts **empty** and is filled by `loadAll()` in an effect — see `initialState` for why it
 * must not start with the demo fixtures. Components never touch repositories or seed data
 * directly, and must not render household data before `hydrated`.
 */

interface AgrocerState {
  pantry: PantryItem[];
  shopping: ShoppingItem[];
  plan: Plan;
  meals: Meal[];
  products: Product[];
  household: Household;
  /** False until the real data has arrived. Nothing may render household data before it. */
  hydrated: boolean;
  /**
   * The load failed and will not retry on its own. `hydrated` stays false, so a screen that
   * gates on it shows a loading state for ever unless it also checks this.
   */
  loadFailed: boolean;
}

interface AgrocerActions {
  addPantryItem: (draft: PantryItemDraft) => Promise<void>;
  updatePantryItem: (id: string, patch: PantryItemPatch) => Promise<void>;
  adjustPantryQuantity: (id: string, delta: number) => Promise<void>;
  removePantryItem: (id: string) => Promise<void>;

  addShoppingItem: (draft: ShoppingItemDraft) => Promise<void>;
  addShoppingItems: (drafts: ShoppingItemDraft[]) => Promise<void>;
  updateShoppingItem: (id: string, patch: ShoppingItemPatch) => Promise<void>;
  toggleShoppingItem: (id: string) => Promise<void>;
  removeShoppingItem: (id: string) => Promise<void>;
  clearChecked: () => Promise<void>;

  assignMeal: (day: DayKey, slot: Slot, mealId: string) => Promise<void>;
  clearMeal: (day: DayKey, slot: Slot) => Promise<void>;
  addMeal: (draft: MealDraft) => Promise<Meal>;
  updateMeal: (id: string, draft: MealDraft) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  listMealFeedback: (mealId: string) => Promise<MealFeedback[]>;
  addMealFeedback: (draft: MealFeedbackDraft) => Promise<MealFeedback>;

  listOrderHistory: () => Promise<OrderLineItem[]>;
  importOrderHistory: (drafts: OrderLineItemDraft[]) => Promise<OrderLineItem[]>;
  matchOrderHistory: () => Promise<{ matched: number; total: number }>;

  toggleFavourite: (id: string) => Promise<void>;

  addMember: (draft: HouseholdMemberDraft) => Promise<void>;
  updateMember: (id: string, draft: HouseholdMemberDraft) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;

  resetDemoData: () => Promise<void>;

  /**
   * Re-reads the shopping list.
   *
   * Exposed for writes that happen outside this provider — today only the assistant's
   * confirmed proposals, which go through `/api/ai/confirm` rather than a repository method,
   * so nothing here would otherwise know the list had changed.
   */
  refreshShopping: () => Promise<void>;
  /** Re-reads the meal catalogue and plan after an assistant recipe save. */
  refreshMeals: () => Promise<void>;
}

type AgrocerValue = AgrocerState & AgrocerActions;

const AgrocerContext = createContext<AgrocerValue | null>(null);

/**
 * What the app holds before anything has loaded: **nothing**.
 *
 * This used to be seeded with the Stage 1 demo fixtures, which was invisible against
 * localStorage (the load resolved in the same tick) and actively harmful over the network.
 * Every screen — and the wall dashboard — rendered someone else's shopping list, meals and
 * children until the fetch came back. On 2026-08-29 that fake list was mistaken for the
 * family's real one during development, which is the mildest possible version of the problem
 * it causes.
 *
 * Empty is honest. A screen briefly showing "Nothing on the list" is a loading state; a
 * screen showing Milk, Bread and Bananas that nobody added is a lie. The demo data still
 * exists and still seeds localStorage for the no-database path — it just no longer pretends
 * to be state before state exists.
 */
const initialState: AgrocerState = {
  pantry: [],
  shopping: [],
  plan: {},
  meals: [],
  products: [],
  household: {
    members: [],
    settings: {
      householdName: '',
      shopLabel: '',
      currency: 'NZD',
      weeklyBudget: null,
      pinDemoDate: false,
      pinnedDate: toIsoDate(new Date()),
      showBreakfastAndLunch: false,
    },
  },
  hydrated: false,
  loadFailed: false,
};

interface ProviderProps {
  children: React.ReactNode;
  /**
   * Injectable for tests. Left unset, the choice comes from the environment: Stage 1
   * localStorage by default, or server-backed shopping when the flag is on. Both branches
   * return module-level singletons, so the identity stays stable across renders and the
   * load effect does not re-fire.
   */
  repositories?: AgrocerRepositories;
}

export function AgrocerProvider({
  children,
  repositories = repositoriesForEnvironment(),
}: ProviderProps) {
  const [state, setState] = useState<AgrocerState>(initialState);

  const loadAll = useCallback(async () => {
    try {
      const [pantry, shopping, plan, meals, products, household] = await Promise.all([
        repositories.pantry.list(),
        repositories.shopping.list(),
        repositories.meals.getPlan(),
        repositories.meals.list(),
        repositories.products.list(),
        repositories.household.get(),
      ]);
      setState({
        pantry,
        shopping,
        plan,
        meals,
        products,
        household,
        hydrated: true,
        loadFailed: false,
      });
    } catch (error) {
      // Previously `void loadAll()` swallowed this entirely: a failed load left `hydrated`
      // false for ever and said nothing, so the app sat in a loading state with no
      // explanation. A 401 is already handled elsewhere by redirecting to sign-in; this is
      // for the rest — the database being unreachable, or the server being down.
      console.error('[agrocer] could not load household data', error);
      setState((prev) => ({ ...prev, hydrated: false, loadFailed: true }));
    }
  }, [repositories]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const refreshPantry = useCallback(async () => {
    const pantry = await repositories.pantry.list();
    setState((prev) => ({ ...prev, pantry }));
  }, [repositories]);

  const refreshShopping = useCallback(async () => {
    const shopping = await repositories.shopping.list();
    setState((prev) => ({ ...prev, shopping }));
  }, [repositories]);

  const refreshProducts = useCallback(async () => {
    const products = await repositories.products.list();
    setState((prev) => ({ ...prev, products }));
  }, [repositories]);

  /** Deleting a meal also rewrites the plan, so both are refreshed together. */
  const refreshMeals = useCallback(async () => {
    const [meals, plan] = await Promise.all([
      repositories.meals.list(),
      repositories.meals.getPlan(),
    ]);
    setState((prev) => ({ ...prev, meals, plan }));
  }, [repositories]);

  const refreshHousehold = useCallback(async () => {
    const household = await repositories.household.get();
    setState((prev) => ({ ...prev, household }));
  }, [repositories]);

  const actions = useMemo<AgrocerActions>(
    () => ({
      async addPantryItem(draft) {
        await repositories.pantry.create(draft);
        await refreshPantry();
      },
      async updatePantryItem(id, patch) {
        await repositories.pantry.update(id, patch);
        await refreshPantry();
      },
      async adjustPantryQuantity(id, delta) {
        await repositories.pantry.adjustQuantity(id, delta);
        await refreshPantry();
      },
      async removePantryItem(id) {
        await repositories.pantry.remove(id);
        await refreshPantry();
      },

      async addShoppingItem(draft) {
        await repositories.shopping.add(draft);
        await refreshShopping();
      },
      async addShoppingItems(drafts) {
        await repositories.shopping.addMany(drafts);
        await refreshShopping();
      },
      async updateShoppingItem(id, patch) {
        await repositories.shopping.update(id, patch);
        await refreshShopping();
      },
      async toggleShoppingItem(id) {
        await repositories.shopping.toggle(id);
        await refreshShopping();
      },
      async removeShoppingItem(id) {
        await repositories.shopping.remove(id);
        await refreshShopping();
      },
      async clearChecked() {
        await repositories.shopping.clearChecked();
        await refreshShopping();
      },

      async assignMeal(day, slot, mealId) {
        const plan = await repositories.meals.assign(day, slot, mealId);
        setState((prev) => ({ ...prev, plan }));
      },
      async clearMeal(day, slot) {
        const plan = await repositories.meals.clear(day, slot);
        setState((prev) => ({ ...prev, plan }));
      },
      async addMeal(draft) {
        const meal = await repositories.meals.create(draft);
        await refreshMeals();
        return meal;
      },
      async updateMeal(id, draft) {
        await repositories.meals.update(id, draft);
        await refreshMeals();
      },
      async removeMeal(id) {
        await repositories.meals.remove(id);
        await refreshMeals();
      },
      async listMealFeedback(mealId) {
        return repositories.feedback.list(mealId);
      },
      async addMealFeedback(draft) {
        return repositories.feedback.add(draft);
      },
      async listOrderHistory() {
        return repositories.orderHistory.list();
      },
      async importOrderHistory(drafts) {
        return repositories.orderHistory.importLines(drafts);
      },
      async matchOrderHistory() {
        return repositories.orderHistory.matchToCatalogue();
      },

      async toggleFavourite(id) {
        await repositories.products.toggleFavourite(id);
        await refreshProducts();
      },

      async addMember(draft) {
        await repositories.household.addMember(draft);
        await refreshHousehold();
      },
      async updateMember(id, draft) {
        await repositories.household.updateMember(id, draft);
        await refreshHousehold();
      },
      async removeMember(id) {
        await repositories.household.removeMember(id);
        await refreshHousehold();
      },
      async updateSettings(patch) {
        await repositories.household.updateSettings(patch);
        await refreshHousehold();
      },

      async resetDemoData() {
        await repositories.reset();
        await loadAll();
      },

      refreshShopping,
      refreshMeals,
    }),
    [
      repositories,
      refreshPantry,
      refreshShopping,
      refreshProducts,
      refreshMeals,
      refreshHousehold,
      loadAll,
    ],
  );

  const value = useMemo<AgrocerValue>(() => ({ ...state, ...actions }), [state, actions]);

  return <AgrocerContext.Provider value={value}>{children}</AgrocerContext.Provider>;
}

export function useAgrocer(): AgrocerValue {
  const context = useContext(AgrocerContext);
  if (!context) throw new Error('useAgrocer must be used inside AgrocerProvider');
  return context;
}
