import type { ShoppingProvider } from './types';

/**
 * New World adapter seam. New World credentials/private pages are deliberately not accessed here;
 * enable this only when an official feed or API is available.
 */
export class NewWorldShoppingProvider implements ShoppingProvider {
  readonly id = 'new-world';
  readonly displayName = 'New World';

  async search(): Promise<never[]> {
    throw new Error('New World product feed is not configured. Review items manually on newworld.co.nz.');
  }
}
