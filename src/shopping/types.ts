import type { ShoppingItem } from '@/domain/schemas/shopping';

export interface ShoppingProduct {
  id: string;
  name: string;
  brand?: string;
  size?: string;
  price?: number;
  sourceUrl?: string;
}

export interface ShoppingProvider {
  readonly id: string;
  readonly displayName: string;
  search(query: string): Promise<ShoppingProduct[]>;
}

export interface TrolleyLine {
  shoppingItem: Pick<ShoppingItem, 'id' | 'name' | 'quantity' | 'unit'>;
  match?: ShoppingProduct;
  status: 'matched' | 'needs-review';
  reason?: string;
}
