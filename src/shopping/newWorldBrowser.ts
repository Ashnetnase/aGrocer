import { NewWorldCompanionClient } from './companion';
import type { ShoppingProvider } from './types';

export class NewWorldBrowserProvider implements ShoppingProvider {
  readonly id = 'new-world-browser';
  readonly displayName = 'New World browser companion';
  constructor(private readonly companion: Pick<NewWorldCompanionClient, 'search'> = new NewWorldCompanionClient()) {}
  search(query: string, storeId?: string) { return this.companion.search(query, storeId); }
}
