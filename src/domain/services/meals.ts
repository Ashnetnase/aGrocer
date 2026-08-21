import type { Meal, Plan } from '../schemas/meal';
import type { DayKey, Slot } from '../schemas/common';
import type { Product } from '../schemas/product';
import type { ShoppingItemDraft } from '../schemas/shopping';
import type { PantryItem } from '../schemas/pantry';

/**
 * Fallback price for an item we have never bought before. Stage 4 replaces this
 * with real price history; until then it keeps estimates in a sensible range
 * instead of showing $0.00.
 */
export const UNKNOWN_ITEM_PRICE = 4.5;

export function mealFor(plan: Plan, day: DayKey, slot: Slot): string | undefined {
  return plan[day]?.[slot];
}

export function findMeal(meals: Meal[], id: string | undefined): Meal | undefined {
  if (!id) return undefined;
  return meals.find((meal) => meal.id === id);
}

export function countPlannedDinners(plan: Plan, dayKeys: readonly DayKey[]): number {
  return dayKeys.filter((key) => Boolean(plan[key]?.dinner)).length;
}

/**
 * Best-effort match of a free-text ingredient ("Beef mince 500g") to a known
 * product. Ingredients are written name-first, so a prefix match is reliable
 * enough for Stage 1 and keeps prices and units realistic.
 */
export function matchProduct(ingredient: string, products: Product[]): Product | undefined {
  const needle = ingredient.trim().toLowerCase();
  return products.find((product) => needle.startsWith(product.name.toLowerCase()));
}

/**
 * Converts a meal's ingredients into shopping list drafts, pricing them from the
 * product catalogue where possible and noting which meal they are for.
 */
export function ingredientsToShoppingDrafts(
  meal: Meal,
  products: Product[],
): ShoppingItemDraft[] {
  return meal.ingredients.map((ingredient) => {
    const product = matchProduct(ingredient, products);
    return {
      name: product ? product.name : ingredient,
      category: product ? product.category : 'Pantry',
      quantity: 1,
      unit: product ? product.unit : 'item',
      price: product ? product.price : UNKNOWN_ITEM_PRICE,
      priority: false,
      note: `For ${meal.name}`,
    };
  });
}

/**
 * Converts a pantry item that is low or out into a shopping list draft, pricing
 * it from the catalogue when the family already buys it.
 */
export function pantryItemToShoppingDraft(
  item: PantryItem,
  products: Product[],
): ShoppingItemDraft {
  const product = matchProduct(item.name, products);
  return {
    name: item.name,
    category: item.category,
    quantity: 1,
    unit: item.unit,
    price: product ? product.price : UNKNOWN_ITEM_PRICE,
    priority: item.state === 'out',
    note: undefined,
  };
}
