import type { Meal, MealIngredient, Plan } from '../schemas/meal';
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

const AMOUNT_AT_END = /\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)?)?\s*$/;

/** Turns a legacy name-first ingredient into editable structured fields. */
export function parseMealIngredient(value: string): MealIngredient {
  const trimmed = value.trim();
  const match = trimmed.match(AMOUNT_AT_END);
  if (!match || !match[1]) return { name: trimmed, amount: 1, unit: 'item' };
  const name = trimmed.slice(0, match.index).trim();
  if (!name) return { name: trimmed, amount: 1, unit: 'item' };
  return {
    name,
    amount: Number(match[1]),
    unit: match[2]?.trim() || 'item',
  };
}

export function formatMealIngredient(ingredient: MealIngredient): string {
  return `${ingredient.name} ${ingredient.amount} ${ingredient.unit}`.trim();
}

export function structuredIngredients(meal: Meal): MealIngredient[] {
  return meal.ingredientDetails ?? meal.ingredients.map(parseMealIngredient);
}

interface NormalizedAmount {
  family: 'mass' | 'volume' | 'count';
  amount: number;
}

function normalizeAmount(amount: number, unit: string): NormalizedAmount | undefined {
  const normalized = unit.toLowerCase().replace(/\.$/, '');
  if (['g', 'gram', 'grams'].includes(normalized)) return { family: 'mass', amount };
  if (['kg', 'kilogram', 'kilograms'].includes(normalized)) return { family: 'mass', amount: amount * 1000 };
  if (['ml', 'millilitre', 'millilitres'].includes(normalized)) return { family: 'volume', amount };
  if (['l', 'litre', 'litres'].includes(normalized)) return { family: 'volume', amount: amount * 1000 };
  if (['dozen'].includes(normalized)) return { family: 'count', amount: amount * 12 };
  if (['item', 'items', 'each', 'pack', 'packs', 'egg', 'eggs'].includes(normalized)) {
    return { family: 'count', amount };
  }
  return undefined;
}

function productPackageAmount(product: Product): NormalizedAmount | undefined {
  const description = `${product.name} ${product.size}`;
  const metric = description.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i);
  if (metric?.[1] && metric[2]) return normalizeAmount(Number(metric[1]), metric[2]);
  const pack = description.match(/(\d+)\s*(?:pack|count|pk)\b/i);
  if (pack?.[1]) return { family: 'count', amount: Number(pack[1]) };
  if (/\bdozen\b/i.test(description)) return { family: 'count', amount: 12 };
  if (/\bper\s+kg\b/i.test(description)) return { family: 'mass', amount: 1000 };
  return normalizeAmount(1, product.unit) ?? { family: 'count', amount: 1 };
}

function packagesNeeded(ingredient: MealIngredient, product: Product): number {
  const needed = normalizeAmount(ingredient.amount, ingredient.unit);
  const packaged = productPackageAmount(product);
  if (!needed || !packaged || needed.family !== packaged.family) return 1;
  return Math.max(1, Math.ceil(needed.amount / packaged.amount));
}

export interface MealCostEstimate {
  total: number;
  pricedIngredients: number;
  totalIngredients: number;
  complete: boolean;
}

/**
 * Estimates the value consumed by a recipe from current catalogue prices. A total is marked
 * complete only when every structured ingredient has a compatible product and package size.
 */
export function estimateMealCost(meal: Meal, products: Product[]): MealCostEstimate {
  const ingredients = meal.ingredientDetails ?? [];
  let total = 0;
  let pricedIngredients = 0;

  for (const ingredient of ingredients) {
    const product = ingredient.productId
      ? products.find((candidate) => candidate.id === ingredient.productId)
      : matchProduct(ingredient.name, products);
    const needed = normalizeAmount(ingredient.amount, ingredient.unit);
    const packaged = product ? productPackageAmount(product) : undefined;
    if (!product || !needed || !packaged || needed.family !== packaged.family) continue;
    total += product.price * (needed.amount / packaged.amount);
    pricedIngredients += 1;
  }

  return {
    total: Math.round(total * 100) / 100,
    pricedIngredients,
    totalIngredients: ingredients.length,
    complete: ingredients.length > 0 && pricedIngredients === ingredients.length,
  };
}

export function mealFor(plan: Plan, day: DayKey, slot: Slot): string | undefined {
  return plan[day]?.[slot];
}

export function findMeal(meals: Meal[], id: string | undefined): Meal | undefined {
  if (!id) return undefined;
  return meals.find((meal) => meal.id === id);
}

/**
 * Strips every reference to a meal from the plan.
 *
 * Deleting a meal that is planned would otherwise leave dangling ids, which
 * render as empty slots that cannot be cleared.
 */
export function removeMealFromPlan(plan: Plan, mealId: string): Plan {
  const next: Plan = {};
  for (const [day, slots] of Object.entries(plan) as [DayKey, Plan[DayKey]][]) {
    if (!slots) continue;
    const kept = Object.fromEntries(
      Object.entries(slots).filter(([, id]) => id !== mealId),
    ) as NonNullable<Plan[DayKey]>;
    next[day] = kept;
  }
  return next;
}

/** How many slots across the week a meal is currently planned into. */
export function countPlannedUses(plan: Plan, mealId: string): number {
  return Object.values(plan).reduce(
    (total, slots) => total + Object.values(slots ?? {}).filter((id) => id === mealId).length,
    0,
  );
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
  return structuredIngredients(meal).map((ingredient) => {
    const product = ingredient.productId
      ? products.find((candidate) => candidate.id === ingredient.productId)
      : matchProduct(ingredient.name, products);
    return {
      name: product ? product.name : ingredient.name,
      category: product ? product.category : 'Pantry',
      quantity: product ? packagesNeeded(ingredient, product) : 1,
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
