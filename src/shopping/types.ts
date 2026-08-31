import type { ShoppingItem } from '@/domain/schemas/shopping';
import type { RetailerProduct } from './schemas';

export type ShoppingProduct = RetailerProduct;

export interface ShoppingProvider {
  readonly id: string;
  readonly displayName: string;
  search(query: string, storeId?: string): Promise<ShoppingProduct[]>;
}

export interface TrolleyLine {
  shoppingItem: Pick<ShoppingItem, 'id' | 'name' | 'quantity' | 'unit'>;
  product?: ShoppingProduct;
  requestedText: string;
  requestedQuantity: number;
  confidence: number;
  source: 'household-preference' | 'exact-id' | 'exact-match' | 'ranked-candidate' | 'unresolved';
  candidates?: ShoppingProduct[];
  status: 'ready' | 'needs-review' | 'unavailable';
  requiresReview: boolean;
  preferenceEnabled?: boolean;
  reason?: string;
}

export interface PreparedTrolley {
  provider: string;
  lines: TrolleyLine[];
  summary: { total: number; ready: number; needsReview: number; unavailable: number; estimatedTotal?: number };
  companion: { online: boolean; message?: string };
  checkout: 'manual';
}
