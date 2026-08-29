import { describe, expect, it } from 'vitest';
import { ManualShoppingProvider } from './manual';
import { prepareTrolley } from './prepare';

describe('prepareTrolley', () => {
  it('matches catalogue items and flags unresolved items', async () => {
    const lines = await prepareTrolley([
      { id: '1', name: 'Milk', category: 'Dairy', quantity: 2, unit: 'bottles', price: 3, priority: false, note: '', checked: false },
      { id: '2', name: 'Coriander', category: 'Fruit & Vegetables', quantity: 1, unit: 'bunch', price: 2, priority: false, note: '', checked: false },
    ], new ManualShoppingProvider([{ id: 'nw-milk', name: 'Milk 2L', price: 4 }]));
    expect(lines[0]?.status).toBe('matched');
    expect(lines[1]?.status).toBe('needs-review');
  });
});
