/**
 * Single import surface for domain types. Every type derives from a Zod schema
 * via `z.infer`, so validation and typing can never drift apart.
 */
export type { Category, DayKey, Slot, StockState } from './schemas/common';
export { CATEGORIES, DAY_KEYS, SLOTS } from './schemas/common';

export type { PantryItem, PantryItemDraft, PantryItemPatch } from './schemas/pantry';
export type { ShoppingItem, ShoppingItemDraft, ShoppingItemPatch } from './schemas/shopping';
export type { Meal, MealDraft, MealTag, Plan, PlanEntry } from './schemas/meal';
export { MEAL_TAGS } from './schemas/meal';
export type { Product, ProductDraft, ProductPatch } from './schemas/product';
export type {
  Household,
  HouseholdMember,
  HouseholdMemberDraft,
  MemberColour,
  MemberRole,
  Settings,
} from './schemas/household';
export { MEMBER_COLOURS, MEMBER_ROLES } from './schemas/household';
