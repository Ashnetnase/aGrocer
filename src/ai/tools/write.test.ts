import { describe, expect, it, vi } from 'vitest';
import type { AgrocerRepositories } from '@/data/repositories/types';
import type { ShoppingItem } from '@/domain/schemas/shopping';
import { READ_ONLY_TOOLS } from './readOnly';
import { WRITE_TOOLS } from './write';

/**
 * Two things matter here. The arguments come from a language model, so they are untrusted and
 * must be validated rather than coerced. And the sentence a person confirms has to name every
 * effect, because it is the only thing standing between the model and the family's list.
 */

const tool = WRITE_TOOLS.addShoppingItem!;

function fakeRepositories(onAdd: (draft: Record<string, unknown>) => ShoppingItem) {
  return {
    shopping: { add: async (draft: unknown) => onAdd(draft as Record<string, unknown>) },
  } as unknown as AgrocerRepositories;
}

const added = (overrides: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id: 's1',
  name: 'Milk',
  category: 'Dairy',
  quantity: 1,
  unit: 'each',
  price: 0,
  priority: false,
  checked: false,
  ...overrides,
});

describe('the write allow-list', () => {
  it('is separate from the read allow-list, so nothing can write by being read', () => {
    for (const name of Object.keys(WRITE_TOOLS)) {
      expect(READ_ONLY_TOOLS[name]).toBeUndefined();
    }
    for (const name of Object.keys(READ_ONLY_TOOLS)) {
      expect(WRITE_TOOLS[name]).toBeUndefined();
    }
  });

  it('holds exactly the writes it is meant to, and no others', () => {
    expect(Object.keys(WRITE_TOOLS)).toEqual(['addShoppingItem', 'addRecipeToMeals']);
  });

  it('lets the model point at a recipe but never describe one', () => {
    // addRecipeToMeals takes an id and nothing else. Every saved field is fetched from the
    // provider at execution time, so a hallucinated recipe produces an id that will not
    // resolve rather than a meal nobody chose.
    const tool = WRITE_TOOLS.addRecipeToMeals!;
    expect(tool.schema.safeParse({ recipeId: '52770' }).success).toBe(true);
    expect(tool.schema.safeParse({ recipeId: '52770', name: 'Invented' })).toMatchObject({
      success: true,
      data: { recipeId: '52770' },
    });
    expect(tool.schema.safeParse({ recipeId: '' }).success).toBe(false);
  });
});

describe('addShoppingItem arguments', () => {
  it('accepts a bare name, which is what "add milk" means', () => {
    expect(tool.schema.safeParse({ name: 'Milk' }).success).toBe(true);
  });

  it('rejects an empty or missing name rather than adding a blank row', () => {
    expect(tool.schema.safeParse({ name: '   ' }).success).toBe(false);
    expect(tool.schema.safeParse({}).success).toBe(false);
  });

  it('rejects a category it does not recognise instead of guessing one', () => {
    expect(tool.schema.safeParse({ name: 'Milk', category: 'Aisle 7' }).success).toBe(false);
  });

  it('rejects a quantity that is not a sane whole number', () => {
    for (const quantity of [0, -1, 2.5, 1000]) {
      expect(tool.schema.safeParse({ name: 'Milk', quantity }).success).toBe(false);
    }
  });

  it('ignores extra fields a model might invent', () => {
    const parsed = tool.schema.safeParse({ name: 'Milk', price: 999, urgent: true });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data).toEqual({ name: 'Milk' });
  });
});

describe('the confirmation sentence', () => {
  it('names the item', () => {
    expect(tool.describe({ name: 'Milk' })).toBe('Add Milk to the shopping list');
  });

  it('names a quantity above one, because that is an effect worth seeing before agreeing', () => {
    expect(tool.describe({ name: 'Bread', quantity: 3 })).toBe(
      'Add Bread ×3 to the shopping list',
    );
  });

  it('stays quiet about a quantity of one', () => {
    expect(tool.describe({ name: 'Milk', quantity: 1 })).toBe('Add Milk to the shopping list');
  });

  it('names the category when one was given', () => {
    expect(tool.describe({ name: 'Milk', category: 'Dairy' })).toBe(
      'Add Milk (Dairy) to the shopping list',
    );
  });
});

describe('executing it', () => {
  it('defaults an omitted category and quantity rather than failing', async () => {
    const add = vi.fn(() => added());
    await tool.execute({ name: 'Milk' }, fakeRepositories(add));

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Milk', quantity: 1, category: 'Pantry' }),
    );
  });

  it('sends a price of zero, because the assistant does not know what anything costs', async () => {
    const add = vi.fn(() => added());
    await tool.execute({ name: 'Milk' }, fakeRepositories(add));

    // A guessed price would quietly corrupt the list total, which the family actually reads.
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ price: 0 }));
  });

  it('reports the quantity the server ended up with, not the one asked for', async () => {
    // `add` merges by name, so asking for one more of something can produce three.
    const result = await tool.execute(
      { name: 'Milk' },
      fakeRepositories(() => added({ quantity: 3 })),
    );

    expect(result).toBe('Added Milk (now ×3) to the shopping list.');
  });

  it('adds several confirmed items through the repository batch path', async () => {
    const addMany = vi.fn(async () => [added(), added({ id: 's2', name: 'Eggs', quantity: 2 })]);
    const repositories = {
      shopping: { addMany },
    } as unknown as AgrocerRepositories;

    const result = await tool.executeMany?.(
      [{ name: 'Milk' }, { name: 'Eggs', quantity: 2, category: 'Dairy' }],
      repositories,
    );

    expect(addMany).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Milk', quantity: 1, category: 'Pantry', price: 0 }),
      expect.objectContaining({ name: 'Eggs', quantity: 2, category: 'Dairy', price: 0 }),
    ]);
    expect(result).toBe(
      'Added Milk (now ×1) and Eggs (now ×2) to the shopping list.',
    );
  });
});
