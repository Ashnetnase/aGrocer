import { chromium, type BrowserContext, type Page } from 'playwright';

let context: BrowserContext | undefined;

export async function visibleNewWorldPage(): Promise<Page> {
  if (!context) {
    const profile = process.env.NEW_WORLD_PROFILE_DIR ?? '.runtime/newworld-profile';
    context = await chromium.launchPersistentContext(profile, {
      headless: false,
      channel: process.env.NEW_WORLD_BROWSER_CHANNEL || 'chrome',
      viewport: null,
    });
  }
  const page = context.pages()[0] ?? await context.newPage();
  if (!page.url().startsWith('https://www.newworld.co.nz')) {
    await page.goto('https://www.newworld.co.nz/', { waitUntil: 'domcontentloaded' });
  }
  return page;
}
