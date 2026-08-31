import { describe, expect, it } from 'vitest';
import { settingsSchema } from './household';

const settings = {
  householdName: 'The Ashfords',
  shopLabel: 'New World Thursday',
  currency: 'NZD' as const,
  pinDemoDate: false,
  pinnedDate: '2026-08-29',
  showBreakfastAndLunch: false,
  newWorldEnabled: false,
  shoppingAddMode: 'new-world' as const,
};

describe('settingsSchema weeklyBudget', () => {
  it('accepts a positive NZD target or no target', () => {
    expect(settingsSchema.parse({ ...settings, weeklyBudget: 250 }).weeklyBudget).toBe(250);
    expect(settingsSchema.parse({ ...settings, weeklyBudget: null }).weeklyBudget).toBeNull();
  });

  it('keeps older local settings valid when the field is absent', () => {
    expect(settingsSchema.parse(settings).weeklyBudget).toBeUndefined();
  });

  it('rejects zero, negative and implausibly large targets', () => {
    for (const weeklyBudget of [0, -1, 10_000]) {
      expect(settingsSchema.safeParse({ ...settings, weeklyBudget }).success).toBe(false);
    }
  });
});
