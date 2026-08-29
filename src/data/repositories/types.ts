import type {
  Household,
  HouseholdMember,
  HouseholdMemberDraft,
  Settings,
} from '@/domain/schemas/household';
import type { MealFeedback, MealFeedbackDraft } from '@/domain/schemas/feedback';
import type { Meal, MealDraft, Plan } from '@/domain/schemas/meal';
import type { PantryItem, PantryItemDraft, PantryItemPatch } from '@/domain/schemas/pantry';
import type { Product, ProductPatch } from '@/domain/schemas/product';
import type { ShoppingItem, ShoppingItemDraft, ShoppingItemPatch } from '@/domain/schemas/shopping';
import type { DayKey, Slot } from '@/domain/schemas/common';

/**
 * Repository contracts (ADR-003).
 *
 * Stage 1 ships a localStorage-backed implementation. Stage 2 replaces the
 * implementation with an API client without touching a single component.
 *
 * Every method is async so the signatures survive that swap unchanged.
 */

export interface PantryRepository {
  list(): Promise<PantryItem[]>;
  create(draft: PantryItemDraft): Promise<PantryItem>;
  update(id: string, patch: PantryItemPatch): Promise<PantryItem | undefined>;
  adjustQuantity(id: string, delta: number): Promise<PantryItem | undefined>;
  remove(id: string): Promise<void>;
}

export interface ShoppingRepository {
  list(): Promise<ShoppingItem[]>;
  /** Adding a name already on the list merges quantities instead of duplicating. */
  add(draft: ShoppingItemDraft): Promise<ShoppingItem>;
  addMany(drafts: ShoppingItemDraft[]): Promise<ShoppingItem[]>;
  update(id: string, patch: ShoppingItemPatch): Promise<ShoppingItem | undefined>;
  toggle(id: string): Promise<ShoppingItem | undefined>;
  remove(id: string): Promise<void>;
  clearChecked(): Promise<void>;
}

export interface MealsRepository {
  list(): Promise<Meal[]>;
  create(draft: MealDraft): Promise<Meal>;
  update(id: string, draft: MealDraft): Promise<Meal | undefined>;
  /** Also strips the meal from any planned slots, so no dangling ids remain. */
  remove(id: string): Promise<void>;
  getPlan(): Promise<Plan>;
  assign(day: DayKey, slot: Slot, mealId: string): Promise<Plan>;
  clear(day: DayKey, slot: Slot): Promise<Plan>;
}

/**
 * Meal feedback history (Stage 2).
 *
 * Append-and-read only: there is no update or delete, because a record of what the family
 * thought last Tuesday is history, not state. Correcting it means adding a newer rating.
 *
 * No screen uses this yet — Stage 4 owns the UI. It exists now so the history starts
 * accumulating, which is the one thing that cannot be added retrospectively.
 */
export interface FeedbackRepository {
  /** Most recent first. `mealId` narrows it to one meal's history. */
  list(mealId?: string): Promise<MealFeedback[]>;
  add(draft: MealFeedbackDraft): Promise<MealFeedback>;
}

export interface ProductsRepository {
  list(): Promise<Product[]>;
  update(id: string, patch: ProductPatch): Promise<Product | undefined>;
  toggleFavourite(id: string): Promise<Product | undefined>;
}

export interface HouseholdRepository {
  get(): Promise<Household>;
  addMember(draft: HouseholdMemberDraft): Promise<HouseholdMember>;
  updateMember(id: string, draft: HouseholdMemberDraft): Promise<HouseholdMember | undefined>;
  removeMember(id: string): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
}

export interface AgrocerRepositories {
  pantry: PantryRepository;
  shopping: ShoppingRepository;
  meals: MealsRepository;
  products: ProductsRepository;
  household: HouseholdRepository;
  feedback: FeedbackRepository;
  /** Wipes Stage 1 persistence and restores the demo data. */
  reset(): Promise<void>;
}
