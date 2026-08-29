const SELECTORS = {
  addButton: ['button[data-testid*="add"]', 'button[aria-label*="add to trolley" i]', 'button[aria-label*="add to cart" i]'],
  increaseButton: ['button[aria-label*="increase" i]', 'button[aria-label*="add one" i]', 'button[data-testid*="increment"]'],
  quantityInput: ['input[data-testid*="quantity"]', 'input[aria-label*="quantity" i]', 'input[type="number"]'],
  login: ['a[href*="login"]', 'a[href*="sign-in"]'],
};

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const firstVisible = (selectors) => selectors.map((selector) => document.querySelector(selector)).find((element) => element && element.getClientRects().length);
const normalise = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function result(item, status, extra = {}) {
  return { shoppingItemId: item.shoppingItemId, status, requestedQuantity: item.quantity, ...extra };
}

async function addCurrent(item) {
  const body = document.body?.innerText || '';
  if (/just a moment|captcha|unusual traffic|access denied/i.test(`${document.title} ${body}`)) return result(item, 'blocked', { message: 'New World presented a security check.' });
  if (firstVisible(SELECTORS.login)) return result(item, 'needs-login', { message: 'Log into New World in this tab, then retry from Agrocer.' });
  if (!normalise(body).includes(normalise(item.expectedName))) return result(item, 'product-not-found', { message: 'The page did not contain the expected product name.' });
  const add = firstVisible(SELECTORS.addButton);
  if (!add) return result(item, 'selector-failed', { message: 'Could not find the Add to trolley control.' });
  add.click();
  await delay(800);
  for (let count = 1; count < item.quantity; count += 1) {
    const increase = firstVisible(SELECTORS.increaseButton);
    if (!increase) return result(item, 'quantity-mismatch', { confirmedQuantity: count, confirmedProductName: item.expectedName });
    increase.click();
    await delay(400);
  }
  const quantity = firstVisible(SELECTORS.quantityInput);
  const verifiedQuantity = quantity ? Number(quantity.value) : NaN;
  if (verifiedQuantity !== item.quantity) return result(item, 'selector-failed', { message: 'The requested quantity could not be visibly verified; success was not assumed.' });
  return result(item, 'added', { confirmedQuantity: verifiedQuantity, confirmedProductName: item.expectedName });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'add-current') return;
  addCurrent(message.item).then((value) => {
    chrome.runtime.sendMessage({ type: 'item-result', result: value });
    sendResponse({ accepted: true });
  });
  return true;
});
