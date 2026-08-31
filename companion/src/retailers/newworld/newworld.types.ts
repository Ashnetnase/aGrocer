import type { Page } from 'playwright';
import type { TrolleyAddItem, TrolleyAddResult } from '../../../../src/shopping/schemas';
import type { RetailerProduct } from '../../../../src/shopping/schemas';

export interface NewWorldBrowserOperations {
  sessionStatus(): Promise<{ browserOpen: boolean; needsLogin: boolean }>;
  search(query: string, storeId?: string): Promise<RetailerProduct[]>;
  add(item: TrolleyAddItem): Promise<TrolleyAddResult>;
  trolleyStatus(): Promise<{ browserOpen: boolean; url?: string }>;
  page(): Promise<Page>;
}
