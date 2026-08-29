import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localRepositories } from './localRepositories';
import { STORAGE_KEYS } from './storage';
import { installFakeStorage, type FakeStorage } from './testStorage';
import { pantrySeed } from '@/data/seed/pantry';
import { shoppingSeed } from '@/data/seed/shopping';
import { mealsSeed } from '@/data/seed/meals';

/**
 * Tests for the Stage 1 persistence layer.
 *
 * This is the piece backing "refresh/reopen without losing data", and the piece
 * a Stage 2 backend replaces — so the contract it honours is worth pinning down.
 */

let storage: FakeStorage;
let restore: () => void;

beforeEach(() => {
  ({ storage, restore } = installFakeStorage());
});

afterEach(() => {
  restore();
  vi.restoreAllMocks();
});

describe('reading with no stored data', () => {
  it('falls back to the seed', async () => {
    await expect(localRepositories.pantry.list()).resolves.toEqual(pantrySeed);
    await expect(localRepositories.shopping.list()).resolves.toEqual(shoppingSeed);
    await expect(localRepositories.meals.list()).resolves.toEqual(mealsSeed);
  });

  it('does not write anything just by reading', async () => {
    await localRepositories.pantry.list();
    expect(storage.getItem(STORAGE_KEYS.pantry)).toBeNull();
  });
});

describe('reading corrupted data', () => {
  it('discards malformed JSON and falls back to the seed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storage.seed(STORAGE_KEYS.pantry, '{not json');

    await expect(localRepositories.pantry.list()).resolves.toEqual(pantrySeed);
    expect(warn).toHaveBeenCalled();
  });

  it('discards data that no longer satisfies the schema', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // A pantry item with an unknown stock state — e.g. written by an older build.
    storage.seed(
      STORAGE_KEYS.pantry,
      JSON.stringify([{ id: 'p1', name: 'Milk', category: 'Dairy', quantity: 1, unit: 'bottle', state: 'ancient' }]),
    );

    await expect(localRepositories.pantry.list()).resolves.toEqual(pantrySeed);
    expect(warn).toHaveBeenCalled();
  });
});

describe('write failures', () => {
  it('does not throw when storage rejects the write', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    storage.failWrites();

    // Losing a write is survivable; taking the screen down with it is not.
    await expect(
      localRepositories.pantry.create({
        name: 'Cumin',
        category: 'Pantry',
        quantity: 1,
        unit: 'jar',
        state: 'good',
        note: undefined,
      }),
    ).resolves.toMatchObject({ name: 'Cumin' });
  });
});

describe('pantry repository', () => {
  it('persists a created item at the top of the list', async () => {
    const created = await localRepositories.pantry.create({
      name: 'Cumin',
      category: 'Pantry',
      quantity: 2,
      unit: 'jar',
      state: 'good',
      note: undefined,
    });

    const items = await localRepositories.pantry.list();
    expect(items[0]).toMatchObject({ id: created.id, name: 'Cumin' });
    expect(items).toHaveLength(pantrySeed.length + 1);
  });

  it('applies stock rules when adjusting quantity', async () => {
    const [first] = await localRepositories.pantry.list();
    const target = first!;

    const zeroed = await localRepositories.pantry.adjustQuantity(target.id, -target.quantity);
    expect(zeroed).toMatchObject({ quantity: 0, state: 'out' });

    const restocked = await localRepositories.pantry.adjustQuantity(target.id, 1);
    expect(restocked).toMatchObject({ quantity: 1, state: 'low' });
  });

  it('returns undefined for an unknown id rather than throwing', async () => {
    await expect(localRepositories.pantry.update('nope', { name: 'X' })).resolves.toBeUndefined();
    await expect(localRepositories.pantry.adjustQuantity('nope', 1)).resolves.toBeUndefined();
  });

  it('removes an item', async () => {
    const [first] = await localRepositories.pantry.list();
    await localRepositories.pantry.remove(first!.id);

    const items = await localRepositories.pantry.list();
    expect(items.some((item) => item.id === first!.id)).toBe(false);
  });
});

describe('shopping repository', () => {
  const draft = {
    name: 'Cumin',
    category: 'Pantry' as const,
    quantity: 1,
    unit: 'jar',
    price: 3.5,
    priority: false,
    note: undefined,
  };

  it('merges quantities instead of duplicating an item already on the list', async () => {
    await localRepositories.shopping.add(draft);
    await localRepositories.shopping.add({ ...draft, quantity: 2 });

    const matches = (await localRepositories.shopping.list()).filter((item) => item.name === 'Cumin');
    expect(matches).toHaveLength(1);
    expect(matches[0]?.quantity).toBe(3);
  });

  it('merges case-insensitively', async () => {
    await localRepositories.shopping.add(draft);
    await localRepositories.shopping.add({ ...draft, name: 'cumin' });

    const matches = (await localRepositories.shopping.list()).filter(
      (item) => item.name.toLowerCase() === 'cumin',
    );
    expect(matches).toHaveLength(1);
  });

  it('does not merge into an item already in the trolley', async () => {
    // "Frozen chips" is seeded as checked — buying more means a new line.
    await localRepositories.shopping.add({ ...draft, name: 'Frozen chips' });

    const matches = (await localRepositories.shopping.list()).filter(
      (item) => item.name === 'Frozen chips',
    );
    expect(matches).toHaveLength(2);
  });

  it('addMany merges repeated names within one batch', async () => {
    await localRepositories.shopping.addMany([draft, { ...draft, quantity: 4 }]);

    const matches = (await localRepositories.shopping.list()).filter((item) => item.name === 'Cumin');
    expect(matches).toHaveLength(1);
    expect(matches[0]?.quantity).toBe(5);
  });

  it('toggles an item and persists it', async () => {
    const [first] = await localRepositories.shopping.list();
    const toggled = await localRepositories.shopping.toggle(first!.id);
    expect(toggled?.checked).toBe(!first!.checked);

    const reloaded = await localRepositories.shopping.list();
    expect(reloaded.find((item) => item.id === first!.id)?.checked).toBe(toggled?.checked);
  });

  it('clearChecked keeps only what is still to buy', async () => {
    await localRepositories.shopping.clearChecked();

    const items = await localRepositories.shopping.list();
    expect(items.every((item) => !item.checked)).toBe(true);
    expect(items).toHaveLength(shoppingSeed.filter((item) => !item.checked).length);
  });
});

describe('meals repository', () => {
  it('persists a created meal', async () => {
    const created = await localRepositories.meals.create({
      name: 'Butter Chicken',
      minutes: 45,
      serves: 5,
      tags: ['Kids'],
      image: undefined,
      description: '',
      ingredients: ['Chicken breast 1kg'],
      ingredientDetails: [
        { name: 'Chicken breast', amount: 1, unit: 'kg', productId: 'pr6' },
      ],
    });

    const meals = await localRepositories.meals.list();
    expect(meals[0]).toMatchObject({
      id: created.id,
      name: 'Butter Chicken',
      ingredientDetails: [{ amount: 1, unit: 'kg', productId: 'pr6' }],
    });
  });

  it('assigning and clearing a slot round-trips through storage', async () => {
    await localRepositories.meals.assign('thu', 'dinner', 'm1');
    expect((await localRepositories.meals.getPlan()).thu?.dinner).toBe('m1');

    await localRepositories.meals.clear('thu', 'dinner');
    expect((await localRepositories.meals.getPlan()).thu?.dinner).toBeUndefined();
  });

  it('deleting a meal also strips it from the planner', async () => {
    // 'm1' is seeded on Monday dinner and Monday lunch.
    await localRepositories.meals.remove('m1');

    const [meals, plan] = await Promise.all([
      localRepositories.meals.list(),
      localRepositories.meals.getPlan(),
    ]);

    expect(meals.some((meal) => meal.id === 'm1')).toBe(false);
    const planned = Object.values(plan).flatMap((slots) => Object.values(slots ?? {}));
    expect(planned).not.toContain('m1');
  });
});

describe('products repository', () => {
  it('toggles a favourite and persists it', async () => {
    const [first] = await localRepositories.products.list();
    const toggled = await localRepositories.products.toggleFavourite(first!.id);

    expect(toggled?.favourite).toBe(!first!.favourite);
    const reloaded = await localRepositories.products.list();
    expect(reloaded.find((product) => product.id === first!.id)?.favourite).toBe(toggled?.favourite);
  });
});

describe('household repository', () => {
  it('derives initials from the name when adding a member', async () => {
    const member = await localRepositories.household.addMember({
      name: 'Mary Jane',
      role: 'Child',
      colour: 'bg-berry-500',
    });
    expect(member.initials).toBe('MJ');
  });

  it('re-derives initials when a member is renamed', async () => {
    const member = await localRepositories.household.addMember({
      name: 'Ash',
      role: 'Adult',
      colour: 'bg-moss-600',
    });

    const updated = await localRepositories.household.updateMember(member.id, {
      name: 'Ashley Rose',
      role: 'Adult',
      colour: 'bg-moss-600',
    });
    expect(updated?.initials).toBe('AR');
  });

  it('merges settings rather than replacing them', async () => {
    const settings = await localRepositories.household.updateSettings({
      householdName: 'The Smiths',
      weeklyBudget: 250,
    });

    expect(settings.householdName).toBe('The Smiths');
    // Untouched fields must survive a partial update.
    expect(settings.shopLabel).toBe('New World Thursday');
    expect(settings.currency).toBe('NZD');
    expect(settings.weeklyBudget).toBe(250);
  });
});

describe('reset', () => {
  it('clears stored data so the seed comes back', async () => {
    await localRepositories.pantry.remove(pantrySeed[0]!.id);
    expect(await localRepositories.pantry.list()).toHaveLength(pantrySeed.length - 1);

    await localRepositories.reset();

    expect(await localRepositories.pantry.list()).toEqual(pantrySeed);
    expect(storage.getItem(STORAGE_KEYS.pantry)).toBeNull();
  });
});
