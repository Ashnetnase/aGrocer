import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { householdSchema } from '@/domain/schemas/household';
import { mealSchema, planSchema } from '@/domain/schemas/meal';
import { pantryItemSchema } from '@/domain/schemas/pantry';
import { productSchema } from '@/domain/schemas/product';
import { shoppingItemSchema } from '@/domain/schemas/shopping';
import { householdSeed } from './household';
import { mealsSeed, planSeed } from './meals';
import { pantrySeed } from './pantry';
import { productsSeed } from './products';
import { shoppingSeed } from './shopping';

/**
 * The seed is the fallback whenever stored data fails validation, so it must
 * always parse. This is the test that catches a schema tightened without the
 * demo data being updated to match.
 */
describe('seed data', () => {
  it('pantry parses', () => {
    expect(() => z.array(pantryItemSchema).parse(pantrySeed)).not.toThrow();
  });

  it('shopping parses', () => {
    expect(() => z.array(shoppingItemSchema).parse(shoppingSeed)).not.toThrow();
  });

  it('products parse', () => {
    expect(() => z.array(productSchema).parse(productsSeed)).not.toThrow();
  });

  it('meals parse', () => {
    expect(() => z.array(mealSchema).parse(mealsSeed)).not.toThrow();
  });

  it('plan parses', () => {
    expect(() => planSchema.parse(planSeed)).not.toThrow();
  });

  it('household parses', () => {
    expect(() => householdSchema.parse(householdSeed)).not.toThrow();
  });

  it('every planned meal id exists in the catalogue', () => {
    const ids = new Set(mealsSeed.map((meal) => meal.id));
    for (const slots of Object.values(planSeed)) {
      for (const mealId of Object.values(slots ?? {})) {
        expect(ids).toContain(mealId);
      }
    }
  });

  it('ids are unique within each collection', () => {
    const unique = (ids: string[]) => new Set(ids).size === ids.length;
    expect(unique(pantrySeed.map((item) => item.id))).toBe(true);
    expect(unique(shoppingSeed.map((item) => item.id))).toBe(true);
    expect(unique(productsSeed.map((item) => item.id))).toBe(true);
    expect(unique(mealsSeed.map((item) => item.id))).toBe(true);
    expect(unique(householdSeed.members.map((item) => item.id))).toBe(true);
  });
});
