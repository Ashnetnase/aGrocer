import type { TrolleyAddItem, TrolleyAddResult } from '../../../../src/shopping/schemas';
import type { RetailerProduct } from '../../../../src/shopping/schemas';
import { visibleNewWorldPage } from '../../browser';
import { newWorldSelectors as selectors } from './newworld.selectors';
import type { NewWorldBrowserOperations } from './newworld.types';

const safeProductUrl = (value: string) => {
  const url = new URL(value);
  if (url.protocol !== 'https:' || (url.hostname !== 'newworld.co.nz' && !url.hostname.endsWith('.newworld.co.nz'))) {
    throw new Error('Only New World HTTPS product URLs are allowed');
  }
  return url.toString();
};

export class NewWorldBrowserClient implements NewWorldBrowserOperations {
  page = visibleNewWorldPage;

  async sessionStatus() {
    const page = await this.page();
    return { browserOpen: true, needsLogin: await page.locator(selectors.loginLink).first().isVisible().catch(() => false) };
  }

  async search(query: string, storeId?: string): Promise<RetailerProduct[]> {
    const page = await this.page();
    const input = page.locator(selectors.searchInput).first();
    if (!await input.isVisible().catch(() => false)) return [];
    await input.fill(query);
    await input.press('Enter');
    await page.waitForLoadState('domcontentloaded');
    const cards = page.locator(selectors.productCard);
    const count = Math.min(await cards.count(), 10);
    const products: RetailerProduct[] = [];
    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      const name = (await card.locator(selectors.productName).first().textContent().catch(() => null))?.trim();
      const href = await card.locator('a[href]').first().getAttribute('href').catch(() => null);
      if (!name || !href) continue;
      const productUrl = new URL(href, page.url()).toString();
      products.push({ retailer: 'new-world', name, productUrl, availability: 'unknown', ...(storeId ? { storeId } : {}) });
    }
    return products;
  }

  async add(item: TrolleyAddItem): Promise<TrolleyAddResult> {
    const base = { shoppingItemId: item.shoppingItemId, requestedQuantity: item.quantity };
    try {
      const page = await this.page();
      const status = await this.sessionStatus();
      if (status.needsLogin) return { ...base, status: 'needs-login', message: 'Log into New World in the visible browser, then retry.' };
      if (!item.productUrl) return { ...base, status: 'requires-review', message: 'A confirmed product URL is required for browser addition.' };
      await page.goto(safeProductUrl(item.productUrl), { waitUntil: 'domcontentloaded' });
      if (await page.locator(selectors.blockedText).first().isVisible().catch(() => false)) return { ...base, status: 'blocked', message: 'New World blocked the automated step. Continue manually.' };
      const body = (await page.locator('body').innerText()).toLowerCase();
      if (!body.includes(item.expectedName.toLowerCase())) return { ...base, status: 'product-not-found', message: 'The opened page did not verify the expected product name.' };
      const add = page.locator(selectors.addButton).first();
      if (!await add.isVisible().catch(() => false)) return { ...base, status: 'selector-failed', message: 'The Add to trolley control could not be located.' };
      await add.click();
      for (let quantity = 1; quantity < item.quantity; quantity += 1) {
        const increase = page.locator(selectors.increaseButton).first();
        if (!await increase.isVisible().catch(() => false)) return { ...base, status: 'quantity-mismatch', confirmedQuantity: quantity, confirmedProductName: item.expectedName };
        await increase.click();
      }
      const verified = await page.locator(selectors.trolleyLine).filter({ hasText: item.expectedName }).first().isVisible().catch(() => false);
      return verified
        ? { ...base, status: 'added', confirmedQuantity: item.quantity, confirmedProductName: item.expectedName }
        : { ...base, status: 'selector-failed', message: 'The trolley did not visibly confirm this product; success was not assumed.' };
    } catch (error) {
      return { ...base, status: 'unknown-error', message: error instanceof Error ? error.message : 'Unknown browser error' };
    }
  }

  async trolleyStatus() {
    const page = await this.page();
    return { browserOpen: true, url: page.url() };
  }
}
