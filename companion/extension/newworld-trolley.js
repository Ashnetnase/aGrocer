const SELECTORS = {
  addButton: ['button[data-testid*="add"]', 'button[aria-label*="add to trolley" i]', 'button[aria-label*="add to cart" i]'],
  increaseButton: ['button[aria-label*="increase" i]', 'button[aria-label*="add one" i]', 'button[data-testid*="increment"]'],
  quantityValue: ['input[data-testid*="quantity"]', 'input[aria-label*="quantity" i]', 'input[name*="quantity" i]', 'input[type="number"]', '[aria-valuenow]', '[data-testid*="quantity"]', '[class*="quantity"]'],
  productHeading: ['main h1', '[data-testid*="product-name"]', '[class*="product-name"] h1'],
  login: ['a[href*="login"]', 'a[href*="sign-in"]'],
};

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const firstVisible = (selectors) => selectors.map((selector) => document.querySelector(selector)).find((element) => element && element.getClientRects().length);
const normalise = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const genericProductName = (value) => /^(view|see|shop) all\b/i.test(value.trim());
const isNewWorldHost = (hostname) => hostname === 'newworld.co.nz' || hostname.endsWith('.newworld.co.nz');

function accessibleText(element) {
  return (element.getAttribute?.('aria-label') || element.getAttribute?.('title') || element.textContent || '').replace(/\s+/g, ' ').trim();
}

function addButton() {
  const selected = firstVisible(SELECTORS.addButton);
  if (selected) return selected;
  return [...document.querySelectorAll('button, [role="button"]')].find((element) =>
    element.getClientRects().length && /^(add|add to (?:my )?(?:trolley|cart))(?:\s+item)?$/i.test(accessibleText(element))
  );
}

function productContainer(anchor, queryTokens) {
  const explicit = anchor.closest('[data-testid*="product" i], [data-test*="product" i], [class*="product-card" i], [class*="product-tile" i], article, li');
  if (explicit && explicit.querySelectorAll('a[href*="/shop/product/"]').length <= 3) return explicit;
  let element = anchor.parentElement;
  let fallback = element || anchor;
  for (let depth = 0; element && depth < 8; depth += 1, element = element.parentElement) {
    const text = normalise(element.textContent || '');
    const containsQuery = !queryTokens.length || queryTokens.some((token) => text.includes(token));
    const hasProductControl = Boolean(element.querySelector('button, input[type="number"], [data-testid*="price" i], [class*="price" i]'));
    const productLinkCount = element.querySelectorAll('a[href*="/shop/product/"]').length;
    if (containsQuery && hasProductControl && productLinkCount <= 3) return element;
    if (containsQuery && productLinkCount <= 2 && text.length >= 4 && text.length <= 500) fallback = element;
  }
  return fallback;
}

function cleanProductName(value) {
  return value.replace(/^image:\s*/i, '').replace(/\s+image(?:\s+\d+)?$/i, '').replace(/\s+/g, ' ').trim();
}

function productName(anchor, container, image, url) {
  const sameProductLinks = [...container.querySelectorAll('a[href]')].filter((candidate) => {
    try { return new URL(candidate.href, document.baseURI).pathname === url.pathname; } catch { return false; }
  });
  const values = [
    ...sameProductLinks.map((candidate) => candidate.textContent || ''),
    anchor.getAttribute('aria-label') || '',
    anchor.getAttribute('title') || '',
    image?.alt || '',
    container.querySelector('[data-testid*="product-name" i], [data-test*="product-name" i], [class*="product-name" i], h2, h3, h4')?.textContent || '',
    url.searchParams.get('name')?.replace(/[-_]+/g, ' ') || '',
  ].map(cleanProductName);
  return values.find((value) => value && !genericProductName(value)) || '';
}

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
    try { url = new URL(anchor.href, document.baseURI); } catch { continue; }
    if (!isNewWorldHost(url.hostname) || !/\/shop\/product\//i.test(url.pathname)) continue;
    url.hash = '';
    const container = productContainer(anchor, queryTokens);
    const containerText = container.textContent?.replace(/\s+/g, ' ').trim() || '';
    if (seen.has(url.href)) continue;
    const image = anchor.querySelector('img') || container.querySelector('img');
    const name = productName(anchor, container, image, url);
    if (!name || genericProductName(name)) continue;
    const textMatches = !queryTokens.length || queryTokens.some((token) => normalise(`${name} ${containerText}`).includes(token));
    if (!textMatches) continue;
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
  const productLinkCount = [...document.querySelectorAll('a[href]')].filter((anchor) => {
    try {
      const url = new URL(anchor.href, document.baseURI);
      return isNewWorldHost(url.hostname) && /\/shop\/product\//i.test(url.pathname);
    } catch { return false; }
  }).length;
  return {
    status: products.length ? 'ok' : 'selector-failed',
    products,
    ...(products.length ? {} : { message: `New World loaded, but Agrocer could not read a valid product card (${productLinkCount} product links detected).` }),
  };
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
    const add = addButton();
    if (!add) {
      const visibleLabels = [...document.querySelectorAll('button, [role="button"]')]
        .filter((element) => element.getClientRects().length)
        .map(accessibleText).filter(Boolean).slice(0, 8);
      return result(item, 'selector-failed', {
        message: `Could not find the Add to trolley control or a visible existing quantity${visibleLabels.length ? `; visible controls: ${visibleLabels.join(', ')}` : ''}.`,
      });
    }
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
