import type { ShoppingItem } from '@/domain/schemas/shopping';
import type { ShoppingProvider, TrolleyLine } from './types';

export async function prepareTrolley(items: ShoppingItem[], provider: ShoppingProvider): Promise<TrolleyLine[]> {
  return Promise.all(items.filter((item) => !item.checked).map(async (item) => {
    const matches = await provider.search(item.name);
    return {
      shoppingItem: { id: item.id, name: item.name, quantity: item.quantity, unit: item.unit },
      match: matches[0],
      status: matches[0] ? 'matched' : 'needs-review',
      reason: matches[0] ? undefined : 'No product match; choose this item manually in New World.',
    } satisfies TrolleyLine;
  }));
}
