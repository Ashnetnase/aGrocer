'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DayKey, Slot } from '@/domain/schemas/common';
import type { Household, HouseholdMemberDraft, Settings } from '@/domain/schemas/household';
import type { Meal, MealDraft, Plan } from '@/domain/schemas/meal';
import type { PantryItem, PantryItemDraft, PantryItemPatch } from '@/domain/schemas/pantry';
import type { Product } from '@/domain/schemas/product';
import type { ShoppingItem, ShoppingItemDraft, ShoppingItemPatch } from '@/domain/schemas/shopping';
import type { AgrocerRepositories } from '@/data/repositories/types';
import { repositoriesForEnvironment } from '@/data/api/repositories';
import { householdSeed } from '@/data/seed/household';
import { mealsSeed, planSeed } from '@/data/seed/meals';
import { pantrySeed } from '@/data/seed/pantry';
import { productsSeed } from '@/data/seed/products';
import { shoppingSeed } from '@/data/seed/shopping';

/**
 * Application state, backed by the repository layer.
 *
 * State is seeded synchronously so the server render and the first client
 * render agree, then rehydrated from localStorage in an effect. Components
 * never touch repositories or seed data directly.
 */

interface AgrocerState {
  pantry: PantryItem[];
  shopping: ShoppingItem[];
  plan: Plan;
  meals: Meal[];
  products: Product[];
  household: Household;
  /** False until localStorage has been read — used to defer persisted-only UI. */
  hydrated: boolean;
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
  addMeal: (draft: MealDraft) => Promise<void>;
  updateMeal: (id: string, draft: MealDraft) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;

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
}

type AgrocerValue = AgrocerState & AgrocerActions;

const AgrocerContext = createContext<AgrocerValue | null>(null);

const initialState: AgrocerState = {
  pantry: pantrySeed,
  shopping: shoppingSeed,
  plan: planSeed,
  meals: mealsSeed,
  products: productsSeed,
  household: householdSeed,
  hydrated: false,
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
    const [pantry, shopping, plan, meals, products, household] = await Promise.all([
      repositories.pantry.list(),
      repositories.shopping.list(),
      repositories.meals.getPlan(),
      repositories.meals.list(),
      repositories.products.list(),
      repositories.household.get(),
    ]);
    setState({ pantry, shopping, plan, meals, products, household, hydrated: true });
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
        await repositories.meals.create(draft);
        await refreshMeals();
      },
      async updateMeal(id, draft) {
        await repositories.meals.update(id, draft);
        await refreshMeals();
      },
      async removeMeal(id) {
        await repositories.meals.remove(id);
        await refreshMeals();
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
