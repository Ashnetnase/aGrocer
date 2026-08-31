import { describe, expect, it } from 'vitest';
import { predictReorders } from './reorderPrediction';

const day = (offset: number) => new Date(`2026-08-${String(29 + offset).padStart(2, '0')}T12:00:00Z`);

describe('predictReorders', () => {
  it('flags repeated use and recent empty items, with empty first', () => {
    const now = new Date('2026-08-29T12:00:00Z');
    const events = [
      { itemName: 'Milk', kind: 'adjusted' as const, quantityDelta: -1, quantityAfter: 1, createdAt: now },
      { itemName: 'Milk', kind: 'adjusted' as const, quantityDelta: -1, quantityAfter: 2, createdAt: day(-1) },
      { itemName: 'Milk', kind: 'adjusted' as const, quantityDelta: -1, quantityAfter: 3, createdAt: day(-2) },
      { itemName: 'Eggs', kind: 'adjusted' as const, quantityDelta: -1, quantityAfter: 0, createdAt: now },
    ];
    expect(predictReorders(events, now)).toEqual([
      { itemName: 'Eggs', reason: 'recently-empty', uses: 1 },
      { itemName: 'Milk', reason: 'repeated-use', uses: 3 },
    ]);
  });

  it('ignores old events and does not infer from non-use changes', () => {
    const now = new Date('2026-08-29T12:00:00Z');
    expect(predictReorders([
      { itemName: 'Rice', kind: 'updated', quantityAfter: 0, createdAt: new Date('2026-01-01') },
      { itemName: 'Flour', kind: 'adjusted', quantityDelta: 1, quantityAfter: 4, createdAt: now },
    ], now)).toEqual([]);
  });
});
