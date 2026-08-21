import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { initialPantry } from '../data/pantry';
import { initialShopping } from '../data/shopping';
import { initialPlan, meals as mealCatalogue } from '../data/meals';
import { products as productCatalogue } from '../data/products';
import { Category, DayKey, Meal, PantryItem, Plan, Product, ShoppingItem, Slot, StockState } from '../types';

interface AgrocerValue {
  pantry: PantryItem[];
  shopping: ShoppingItem[];
  plan: Plan;
  meals: Meal[];
  products: Product[];
  shoppingMode: boolean;
  setShoppingMode: (value: boolean) => void;
  addPantryItem: (item: Omit<PantryItem, 'id'>) => void;
  updatePantryQuantity: (id: string, delta: number) => void;
  updatePantryItem: (id: string, patch: Partial<PantryItem>) => void;
  setPantryState: (id: string, state: StockState) => void;
  removePantryItem: (id: string) => void;
  addShoppingItem: (item: Omit<ShoppingItem, 'id' | 'checked'>) => void;
  updateShoppingItem: (id: string, patch: Partial<ShoppingItem>) => void;
  toggleShoppingItem: (id: string) => void;
  removeShoppingItem: (id: string) => void;
  clearChecked: () => void;
  assignMeal: (day: DayKey, slot: Slot, mealId: string) => void;
  clearMeal: (day: DayKey, slot: Slot) => void;
  getMeal: (id?: string) => Meal | undefined;
}

const AgrocerContext = createContext<AgrocerValue | null>(null);

let counter = 100;
const nextId = (prefix: string) => `${prefix}${++counter}`;

export function AgrocerProvider({ children }: {children: React.ReactNode;}) {
  const [pantry, setPantry] = useState<PantryItem[]>(initialPantry);
  const [shopping, setShopping] = useState<ShoppingItem[]>(initialShopping);
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [shoppingMode, setShoppingMode] = useState(false);

  const addPantryItem = useCallback((item: Omit<PantryItem, 'id'>) => {
    setPantry((prev) => [{ ...item, id: nextId('p') }, ...prev]);
  }, []);

  const updatePantryQuantity = useCallback((id: string, delta: number) => {
    setPantry((prev) =>
    prev.map((item) => {
      if (item.id !== id) return item;
      const quantity = Math.max(0, item.quantity + delta);
      let state: StockState = item.state;
      if (quantity === 0) state = 'out';else
      if (item.state === 'out') state = 'low';
      return { ...item, quantity, state };
    })
    );
  }, []);

  const updatePantryItem = useCallback((id: string, patch: Partial<PantryItem>) => {
    setPantry((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item));
  }, []);

  const setPantryState = useCallback((id: string, state: StockState) => {
    setPantry((prev) => prev.map((item) => item.id === id ? { ...item, state } : item));
  }, []);

  const removePantryItem = useCallback((id: string) => {
    setPantry((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addShoppingItem = useCallback((item: Omit<ShoppingItem, 'id' | 'checked'>) => {
    setShopping((prev) => {
      const existing = prev.find((i) => i.name.toLowerCase() === item.name.toLowerCase() && !i.checked);
      if (existing) {
        return prev.map((i) => i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [{ ...item, id: nextId('s'), checked: false }, ...prev];
    });
  }, []);

  const updateShoppingItem = useCallback((id: string, patch: Partial<ShoppingItem>) => {
    setShopping((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item));
  }, []);

  const toggleShoppingItem = useCallback((id: string) => {
    setShopping((prev) => prev.map((item) => item.id === id ? { ...item, checked: !item.checked } : item));
  }, []);

  const removeShoppingItem = useCallback((id: string) => {
    setShopping((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearChecked = useCallback(() => {
    setShopping((prev) => prev.filter((item) => !item.checked));
  }, []);

  const assignMeal = useCallback((day: DayKey, slot: Slot, mealId: string) => {
    setPlan((prev) => ({ ...prev, [day]: { ...prev[day], [slot]: mealId } }));
  }, []);

  const clearMeal = useCallback((day: DayKey, slot: Slot) => {
    setPlan((prev) => {
      const next = { ...prev[day] };
      delete next[slot];
      return { ...prev, [day]: next };
    });
  }, []);

  const getMeal = useCallback((id?: string) => mealCatalogue.find((meal) => meal.id === id), []);

  const value = useMemo<AgrocerValue>(
    () => ({
      pantry,
      shopping,
      plan,
      meals: mealCatalogue,
      products: productCatalogue,
      shoppingMode,
      setShoppingMode,
      addPantryItem,
      updatePantryQuantity,
      updatePantryItem,
      setPantryState,
      removePantryItem,
      addShoppingItem,
      updateShoppingItem,
      toggleShoppingItem,
      removeShoppingItem,
      clearChecked,
      assignMeal,
      clearMeal,
      getMeal
    }),
    [
    pantry,
    shopping,
    plan,
    shoppingMode,
    addPantryItem,
    updatePantryQuantity,
    updatePantryItem,
    setPantryState,
    removePantryItem,
    addShoppingItem,
    updateShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    clearChecked,
    assignMeal,
    clearMeal,
    getMeal]

  );

  return <AgrocerContext.Provider value={value}>{children}</AgrocerContext.Provider>;
}

export function useAgrocer() {
  const context = useContext(AgrocerContext);
  if (!context) throw new Error('useAgrocer must be used inside AgrocerProvider');
  return context;
}

export const categoryOf = (name: string): Category => {
  const product = productCatalogue.find((p) => p.name.toLowerCase() === name.toLowerCase());
  return product ? product.category : 'Pantry';
};