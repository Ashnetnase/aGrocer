/** Centralised because retailer markup changes; none of these selectors imply live validation. */
export const newWorldSelectors = {
  loginLink: 'a[href*="login"], a[href*="sign-in"]',
  searchInput: 'input[type="search"], input[placeholder*="Search" i]',
  productCard: '[data-testid*="product"], article',
  productLink: 'a[href*="/shop/product/"]',
  productName: '[data-testid*="product-name"], h1, h2, h3',
  addButton: 'button:has-text("Add to trolley"), button:has-text("Add")',
  increaseButton: 'button[aria-label*="increase" i], button[aria-label*="add one" i]',
  trolleyLine: '[data-testid*="trolley"], [data-testid*="cart"]',
  blockedText: 'text=/captcha|unusual traffic|access denied/i',
} as const;
