const SELECTORS = {
  addButton: ['button[data-testid*="add"]', 'button[aria-label*="add to trolley" i]', 'button[aria-label*="add to cart" i]'],
  increaseButton: ['button[aria-label*="increase" i]', 'button[aria-label*="add one" i]', 'button[data-testid*="increment"]'],
  quantityValue: ['input[data-testid*="quantity"]', 'input[aria-label*="quantity" i]', 'input[type="number"]', '[aria-valuenow]', '[data-testid*="quantity"]', '[class*="quantity"]'],
  productHeading: ['main h1', '[data-testid*="product-name"]', '[class*="product-name"] h1'],
  login: ['a[href*="login"]', 'a[href*="sign-in"]'],
};

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const firstVisible = (selectors) => selectors.map((selector) => document.querySelector(selector)).find((element) => element && element.getClientRects().length);
const normalise = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const genericProductName = (value) => /^(view|see|shop) all\b/i.test(value.trim());

function imageUrl(image, container) {
  const source = image?.currentSrc || image?.getAttribute?.('src') || image?.getAttribute?.('data-src') ||
    image?.getAttribute?.('data-lazy-src') || container.querySelector('source[srcset]')?.getAttribute('srcset')?.split(',')[0]?.trim().split(/\s+/)[0] ||
    image?.getAttribute?.('srcset')?.split(',')[0]?.trim().split(/\s+/)[0];
  if (!source) return undefined;
  try {
    const url = new URL(source, document.baseURI);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch { return undefined; }
}

function numberFrom(element) {
  if (!element) return undefined;
  const values = [element.value, element.getAttribute?.('aria-valuenow'), element.getAttribute?.('data-quantity')];
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    const number = Number(value);
    if (Number.isInteger(number) && number >= 0) return number;
  }
  const text = element.textContent?.trim() || element.getAttribute?.('aria-label') || '';
  const exact = text.match(/^\s*(\d+)\s*$/)?.[1];
  const labelled = text.match(/\bquantity\s*:?\s*(\d+)\b/i)?.[1];
  const number = Number(exact ?? labelled);
  return Number.isInteger(number) && number >= 0 ? number : undefined;
}

function readVisibleQuantity() {
  const increase = firstVisible(SELECTORS.increaseButton);
  const control = increase?.closest('[data-testid*="quantity"], [class*="quantity"], [role="group"], form');
  const candidates = [
    ...(control ? SELECTORS.quantityValue.flatMap((selector) => [...control.querySelectorAll(selector)]) : []),
    ...SELECTORS.quantityValue.flatMap((selector) => [...document.querySelectorAll(selector)]),
  ];
  for (const element of candidates) {
    if (!element.getClientRects().length) continue;
    const quantity = numberFrom(element);
    if (quantity !== undefined) return quantity;
  }
  return undefined;
}

async function waitForQuantity() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const quantity = readVisibleQuantity();
    if (quantity !== undefined) return quantity;
    await delay(250);
  }
  return undefined;
}

function result(item, status, extra = {}) {
  return { shoppingItemId: item.shoppingItemId, status, requestedQuantity: item.quantity, ...extra };
}

function extractProducts(query) {
  const body = document.body?.innerText || '';
  if (/just a moment|captcha|unusual traffic|access denied/i.test(`${document.title} ${body}`)) return { status: 'blocked', products: [], message: 'New World presented a security check.' };
  const queryTokens = normalise(query).split(' ').filter(Boolean);
  const seen = new Set();
  const products = [];
  for (const anchor of document.querySelectorAll('a[href]')) {
    let url;
    try { url = new URL(anchor.href); } catch { continue; }
    if (url.hostname !== 'www.newworld.co.nz' || !/\/shop\/product\//i.test(url.pathname)) continue;
    const container = anchor.closest('[data-testid*="product-card"], article, li') || anchor.parentElement || anchor;
    const containerText = container.textContent?.replace(/\s+/g, ' ').trim() || '';
    const textMatches = queryTokens.some((token) => normalise(containerText).includes(token));
    if (!textMatches || seen.has(url.href)) continue;
    const image = anchor.querySelector('img') || container.querySelector('img');
    const heading = anchor.querySelector('h1, h2, h3, h4, [data-testid*="name"]') || container.querySelector('h1, h2, h3, h4, [data-testid*="name"]');
    const name = (heading?.textContent || anchor.getAttribute('aria-label') || anchor.getAttribute('title') || image?.alt || '').replace(/\s+/g, ' ').trim();
    if (!name || genericProductName(name) || !queryTokens.some((token) => normalise(`${name} ${containerText}`).includes(token))) continue;
    const priceText = containerText.match(/\$\s*(\d+(?:\.\d{1,2})?)/)?.[1];
    seen.add(url.href);
    products.push({
      retailer: 'new-world',
      name,
      productUrl: url.href,
      externalProductId: url.pathname.split('/').filter(Boolean).at(-1),
      availability: /unavailable|out of stock/i.test(containerText) ? 'unavailable' : 'unknown',
      ...(imageUrl(image, container) ? { imageUrl: imageUrl(image, container) } : {}),
      ...(priceText ? { price: Number(priceText) } : {}),
    });
    if (products.length >= 12) break;
  }
  return { status: products.length ? 'ok' : 'selector-failed', products, ...(products.length ? {} : { message: 'No product cards could be read from the New World search page.' }) };
}

async function addCurrent(item) {
  const body = document.body?.innerText || '';
  if (/just a moment|captcha|unusual traffic|access denied/i.test(`${document.title} ${body}`)) return result(item, 'blocked', { message: 'New World presented a security check.' });
  if (firstVisible(SELECTORS.login)) return result(item, 'needs-login', { message: 'Log into New World in this tab, then retry from Agrocer.' });
  const heading = firstVisible(SELECTORS.productHeading);
  const confirmedName = heading?.textContent?.replace(/\s+/g, ' ').trim();
  const expected = normalise(item.expectedName);
  const confirmed = normalise(confirmedName || '');
  if (!confirmed || (!confirmed.includes(expected) && !expected.includes(confirmed))) {
    return result(item, 'product-not-found', { message: `Opened product did not match “${item.expectedName}”${confirmedName ? `; New World showed “${confirmedName}”` : ''}.` });
  }

  let count = readVisibleQuantity();
  if (count === undefined) {
    const add = firstVisible(SELECTORS.addButton);
    if (!add) return result(item, 'selector-failed', { message: 'Could not find the Add to trolley control or a visible existing quantity.' });
    add.click();
    count = await waitForQuantity();
    if (count === undefined) return result(item, 'selector-failed', { confirmedProductName: confirmedName, message: 'New World reacted to Add, but the product quantity could not be visibly verified.' });
  }
  if (count > item.quantity) {
    return result(item, 'quantity-mismatch', { confirmedQuantity: count, confirmedProductName: confirmedName, message: 'The trolley already contains more than the requested quantity; nothing was removed.' });
  }
  while (count < item.quantity) {
    const increase = firstVisible(SELECTORS.increaseButton);
    if (!increase) return result(item, 'quantity-mismatch', { confirmedQuantity: count, confirmedProductName: confirmedName });
    increase.click();
    await delay(500);
    const next = readVisibleQuantity();
    if (next === undefined || next <= count) return result(item, 'quantity-mismatch', { confirmedQuantity: count, confirmedProductName: confirmedName, message: 'The quantity control did not visibly increase.' });
    count = next;
  }
  return result(item, 'added', { confirmedQuantity: count, confirmedProductName: confirmedName });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'extract-products') {
    sendResponse(extractProducts(message.query));
    return;
  }
  if (message?.type !== 'add-current') return;
  addCurrent(message.item).then((value) => {
    chrome.runtime.sendMessage({ type: 'item-result', result: value });
    sendResponse({ accepted: true });
  });
  return true;
});
