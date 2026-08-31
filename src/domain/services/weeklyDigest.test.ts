import { describe, expect, it } from 'vitest';
import { buildWeeklyDigest } from './weeklyDigest';
import type { Meal, Plan } from '../schemas/meal';
import type { ShoppingItem } from '../schemas/shopping';

const meal = (overrides: Partial<Meal> = {}): Meal => ({
  id: 'm1',
  name: 'Sausage pasta',
  minutes: 25,
  serves: 5,
  tags: [],
  description: '',
  ingredients: [],
  ...overrides,
});

const item = (overrides: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id: 's1',
  name: 'Milk',
  category: 'Dairy',
  quantity: 1,
  unit: 'bottle',
  price: 4,
  priority: false,
  checked: false,
  ...overrides,
});

// A Wednesday, so the week and "(today)" marker are predictable.
const NOW = new Date('2026-08-26T18:00:00+12:00');

describe('buildWeeklyDigest', () => {
  it('lists each planned dinner and marks today', () => {
    const plan: Plan = { wed: { dinner: 'm1' } };
    const digest = buildWeeklyDigest(plan, [meal({ id: 'm1', name: 'Sausage pasta' })], [], undefined, NOW);
    expect(digest.text).toContain('Wednesday (today): Sausage pasta (25 min)');
    expect(digest.text).toContain('Monday: Nothing planned');
  });

  it('lists remaining shopping items with quantity and unit, and counts what is already checked', () => {
    const shopping = [
      item({ id: '1', name: 'Milk', quantity: 1 }),
      item({ id: '2', name: 'Bread', quantity: 2, unit: 'loaf' }),
      item({ id: '3', name: 'Bananas', checked: true }),
    ];
    const digest = buildWeeklyDigest({}, [], shopping, undefined, NOW);
    expect(digest.text).toContain('  - Milk');
    expect(digest.text).toContain('  - Bread ×2 loaf');
    expect(digest.text).toContain('(2 items left, 1 already in the trolley)');
    expect(digest.text).not.toContain('Bananas');
  });

  it('says nothing is left to buy rather than an empty list', () => {
    const digest = buildWeeklyDigest({}, [], [], undefined, NOW);
    expect(digest.text).toContain('Nothing left to buy.');
  });

  it('includes the weekly budget comparison only when one is set', () => {
    const shopping = [item({ price: 10, quantity: 1 })];
    const withBudget = buildWeeklyDigest({}, [], shopping, 50, NOW);
    expect(withBudget.text).toContain('weekly budget $50.00');
    expect(withBudget.text).toContain('$40.00 left');

    const withoutBudget = buildWeeklyDigest({}, [], shopping, undefined, NOW);
    expect(withoutBudget.text).not.toContain('weekly budget');
  });

  it('never invents a meal for a slot with no plan entry', () => {
    const digest = buildWeeklyDigest({}, [], [], undefined, NOW);
    expect(digest.text).not.toMatch(/undefined|null/i);
  });
});
