import type { ShoppingItem } from '@/domain/schemas/shopping';
import type { ShoppingProvider, TrolleyLine } from './types';
import type { ProductPreferenceReader } from './matching';
import { resolveShoppingItem } from './matching';

export async function prepareTrolley(
  items: ShoppingItem[],
  provider: ShoppingProvider,
  preferences?: ProductPreferenceReader,
  storeId?: string,
): Promise<TrolleyLine[]> {
  return Promise.all(items.filter((item) => !item.checked).map((item) =>
    resolveShoppingItem(item, provider, preferences, storeId)));
}
