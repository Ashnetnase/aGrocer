import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgrocerRepositories } from '@/data/repositories/types';
import type { Meal, Plan } from '@/domain/schemas/meal';
import type { PantryItem } from '@/domain/schemas/pantry';
import type { ShoppingItem } from '@/domain/schemas/shopping';
import { READ_ONLY_TOOLS } from './readOnly';
import { runTool } from './registry';

/**
 * These tools are the only path by which a model reaches household data, so what matters is
 * that they read and never write, that they hand over prose the model cannot misread, and
 * that the registry refuses anything not on the allow-list.
 */

const shoppingItem = (overrides: Partial<ShoppingItem> = {}): ShoppingItem => ({
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

const pantryItem = (overrides: Partial<PantryItem> = {}): PantryItem => ({
  id: 'p1',
  name: 'Rice',
  category: 'Pantry',
  quantity: 2,
  unit: 'kg',
  state: 'good',
  ...overrides,
});

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

/**
 * Only the methods the tools are allowed to touch are implemented. Every write throws, so a
 * tool that reaches for one fails the test rather than quietly mutating the household.
 */
function fakeRepositories(data: {
  shopping?: ShoppingItem[];
  pantry?: PantryItem[];
  meals?: Meal[];
  plan?: Plan;
}): AgrocerRepositories {
  const forbidden = () => {
    throw new Error('A read-only tool attempted a write');
  };

  return {
    shopping: {
      list: async () => data.shopping ?? [],
      add: forbidden,
      addMany: forbidden,
      update: forbidden,
      toggle: forbidden,
      remove: forbidden,
      clearChecked: forbidden,
    },
    pantry: {
      list: async () => data.pantry ?? [],
      create: forbidden,
      update: forbidden,
      adjustQuantity: forbidden,
      remove: forbidden,
    },
    meals: {
      list: async () => data.meals ?? [],
      getPlan: async () => data.plan ?? {},
      create: forbidden,
      update: forbidden,
      remove: forbidden,
      assign: forbidden,
      clear: forbidden,
    },
    products: { list: async () => [], update: forbidden, toggleFavourite: forbidden },
    household: {
      get: forbidden,
      addMember: forbidden,
      updateMember: forbidden,
      removeMember: forbidden,
      updateSettings: forbidden,
    },
    reset: forbidden,
  } as unknown as AgrocerRepositories;
}

const run = (name: string, repos: AgrocerRepositories) => runTool(READ_ONLY_TOOLS, name, repos);

describe('the allow-list', () => {
  it('exposes exactly the read-only tools, and no others', () => {
    expect(Object.keys(READ_ONLY_TOOLS)).toEqual([
      'getShoppingList',
      'getPantry',
      'getMealPlan',
      'searchRecipes',
    ]);
  });

  it('every household tool takes no arguments, so nothing the model emits widens its read', () => {
    // searchRecipes is the exception and reads no household data at all — a search needs a
    // query. Everything that touches the family's own data stays argument-free.
    for (const [name, tool] of Object.entries(READ_ONLY_TOOLS)) {
      if (name === 'searchRecipes') continue;
      expect(tool.spec.parameters).toEqual({ type: 'object', properties: {} });
      expect(tool.schema).toBeUndefined();
    }
  });

  it('validates the arguments of the one tool that takes them', () => {
    // A tool with arguments and no schema would hand model output straight to an
    // implementation, which is the thing ADR-015 exists to prevent.
    const search = READ_ONLY_TOOLS.searchRecipes!;
    expect(search.schema).toBeDefined();
    expect(search.schema!.safeParse({ query: 'chicken' }).success).toBe(true);
    expect(search.schema!.safeParse({ query: 'a' }).success).toBe(false);
    expect(search.schema!.safeParse({}).success).toBe(false);
  });

  it('refuses a tool that is not on the list, and tells the model rather than throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await run('deleteEverything', fakeRepositories({}));

    expect(result.ok).toBe(false);
    expect(result.content).toMatch(/no tool called/i);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('turns a failing tool into a refusal instead of leaking the error', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const repos = fakeRepositories({});
    repos.shopping.list = async () => {
      throw new Error('postgresql://user:hunter2@db.example.com/postgres is unreachable');
    };

    const result = await run('getShoppingList', repos);

    expect(result.ok).toBe(false);
    expect(result.content).not.toMatch(/postgres|hunter2/i);
    error.mockRestore();
  });
});

describe('getShoppingList', () => {
  it('separates what is still needed from what is already in the trolley', async () => {
    const repos = fakeRepositories({
      shopping: [
        shoppingItem({ id: '1', name: 'Milk', price: 4, quantity: 1 }),
        shoppingItem({ id: '2', name: 'Bread', price: 3, quantity: 2, unit: 'loaf' }),
        shoppingItem({ id: '3', name: 'Bananas', price: 2, checked: true }),
      ],
    });

    const { content } = await run('getShoppingList', repos);

    expect(content).toMatch(/Still needed \(2\)/);
    expect(content).toContain('Bread ×2 loaf');
    expect(content).toContain('Already in the trolley: Bananas');
    expect(content).toMatch(/\$12\.00/);
  });

  it('says the list is empty rather than returning nothing to guess from', async () => {
    const { content } = await run('getShoppingList', fakeRepositories({ shopping: [] }));
    expect(content).toBe('The shopping list is empty.');
  });

  it('never hands the model an id', async () => {
    const repos = fakeRepositories({ shopping: [shoppingItem({ id: 'secret-uuid-1234' })] });
    const { content } = await run('getShoppingList', repos);
    expect(content).not.toContain('secret-uuid-1234');
  });
});

describe('getPantry', () => {
  it('groups by stock state, because "what can I cook" and "what do we need" are opposite ends', async () => {
    const repos = fakeRepositories({
      pantry: [
        pantryItem({ id: '1', name: 'Rice', quantity: 2, unit: 'kg' }),
        pantryItem({ id: '2', name: 'Mince', state: 'low', quantity: 1, unit: 'pack' }),
        pantryItem({ id: '3', name: 'Butter', state: 'out', quantity: 0, unit: 'block' }),
      ],
    });

    const { content } = await run('getPantry', repos);

    expect(content).toContain('In stock: Rice (2 kg)');
    expect(content).toContain('Running low: Mince (1 pack)');
    expect(content).toContain('Out of: Butter');
  });

  it('treats "soon" as running low rather than dropping it', async () => {
    const repos = fakeRepositories({ pantry: [pantryItem({ name: 'Yoghurt', state: 'soon' })] });
    const { content } = await run('getPantry', repos);
    expect(content).toContain('Running low: Yoghurt');
  });

  it('says the pantry is empty', async () => {
    const { content } = await run('getPantry', fakeRepositories({ pantry: [] }));
    expect(content).toBe('The pantry is empty.');
  });
});

describe('getMealPlan', () => {
  // The tool derives the week from the real date, so the day names it prints depend on today.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-26T18:00:00+12:00')); // a Wednesday
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks today, so the model never has to work out what day it is', async () => {
    const repos = fakeRepositories({
      meals: [meal({ id: 'm1', name: 'Sausage pasta', minutes: 25 })],
      plan: { wed: { dinner: 'm1' } },
    });

    const { content } = await run('getMealPlan', repos);

    expect(content).toContain('Wednesday (today): dinner Sausage pasta (25 min)');
  });

  it('lists only the days that have something planned', async () => {
    const repos = fakeRepositories({
      meals: [meal({ id: 'm1', name: 'Sausage pasta' }), meal({ id: 'm2', name: 'Roast' })],
      plan: { wed: { dinner: 'm1' }, sun: { dinner: 'm2' } },
    });

    const { content } = await run('getMealPlan', repos);

    expect(content).toContain('Wednesday');
    expect(content).toContain('Sunday');
    expect(content).not.toContain('Monday');
  });

  it('drops a planned slot whose meal no longer exists rather than inventing a name', async () => {
    const repos = fakeRepositories({ meals: [], plan: { wed: { dinner: 'deleted-meal' } } });

    const { content } = await run('getMealPlan', repos);

    expect(content).toMatch(/Nothing is planned this week/);
    expect(content).not.toContain('deleted-meal');
  });

  it('says nothing is planned rather than leaving the model to fill the gap', async () => {
    const { content } = await run('getMealPlan', fakeRepositories({ plan: {} }));
    expect(content).toMatch(/^Nothing is planned this week\./);
  });
});
