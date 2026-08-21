export type Category =
'Fruit & Vegetables' |
'Meat & Seafood' |
'Dairy' |
'Bakery' |
'Pantry' |
'Frozen' |
'Drinks' |
'Snacks' |
'Household';

export const CATEGORIES: Category[] = [
'Fruit & Vegetables',
'Meat & Seafood',
'Dairy',
'Bakery',
'Pantry',
'Frozen',
'Drinks',
'Snacks',
'Household'];


export type StockState = 'good' | 'low' | 'out' | 'soon';

export interface PantryItem {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  unit: string;
  state: StockState;
  note?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  unit: string;
  price: number;
  priority: boolean;
  note?: string;
  checked: boolean;
}

export type MealTag = 'Quick' | 'Kids' | 'Budget' | 'Favourite' | 'Weekend';

export interface Meal {
  id: string;
  name: string;
  minutes: number;
  serves: number;
  tags: MealTag[];
  image: string;
  description: string;
  ingredients: string[];
}

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type Slot = 'breakfast' | 'lunch' | 'dinner';

export interface Day {
  key: DayKey;
  label: string;
  short: string;
  date: string;
}

export type Plan = Record<DayKey, Partial<Record<Slot, string>>>;

export interface Product {
  id: string;
  name: string;
  brand: string;
  size: string;
  category: Category;
  price: number;
  defaultQuantity: number;
  unit: string;
  favourite: boolean;
  timesBought: number;
}

export interface HouseholdMember {
  id: string;
  name: string;
  initials: string;
  role: 'Adult' | 'Child';
  colour: string;
}