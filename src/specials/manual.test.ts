import { describe, expect, it } from 'vitest';
import { ManualSpecialsProvider } from './manual';

describe('ManualSpecialsProvider', () => {
  it('matches offers locally without external calls', async () => {
    const provider = new ManualSpecialsProvider([{ productName: 'Milk', retailer: 'Manual', price: 3 }]);
    expect(await provider.search('milk')).toHaveLength(1);
    expect(await provider.search('bread')).toEqual([]);
  });
  it('does not return every offer for a blank query', async () => {
    const provider = new ManualSpecialsProvider([{ productName: 'Milk', retailer: 'Manual', price: 3 }]);
    expect(await provider.search(' ')).toEqual([]);
  });
});
