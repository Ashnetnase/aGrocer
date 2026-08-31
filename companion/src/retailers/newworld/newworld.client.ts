import type { TrolleyAddItem, TrolleyAddResult } from '../../../../src/shopping/schemas';
import type { RetailerProduct } from '../../../../src/shopping/schemas';
import { visibleNewWorldPage } from '../../browser';
import { newWorldSelectors as selectors } from './newworld.selectors';
import type { NewWorldBrowserOperations } from './newworld.types';

export class NewWorldBlockedError extends Error {}

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
    const searchUrl = new URL('/shop/search', 'https://www.newworld.co.nz');
    searchUrl.searchParams.set('pg', '1');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('sf', 'products');
    await page.goto(searchUrl.toString(), { waitUntil: 'domcontentloaded' });
    if ((await page.title()).toLowerCase().includes('just a moment') || await page.locator(selectors.blockedText).first().isVisible().catch(() => false)) {
      throw new NewWorldBlockedError('New World presented a security check. Complete it in the visible browser, then retry.');
    }
    const raw = await page.locator(selectors.productLink).evaluateAll((links) => links.map((link) => ({
      href: (link as HTMLAnchorElement).href,
      name: link.textContent?.replace(/\s+/g, ' ').trim() || (link.querySelector('img') as HTMLImageElement | null)?.alt?.trim() || '',
    })));
    const seen = new Set<string>();
    return raw.flatMap(({ href, name }) => {
      if (!href || !name || seen.has(href)) return [];
      seen.add(href);
      const externalProductId = new URL(href).pathname.split('/').filter(Boolean).at(-1);
      return [{
        retailer: 'new-world' as const,
        name,
        productUrl: href,
        availability: 'unknown' as const,
        ...(externalProductId ? { externalProductId } : {}),
        ...(storeId ? { storeId } : {}),
      }];
    }).slice(0, 10);
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
