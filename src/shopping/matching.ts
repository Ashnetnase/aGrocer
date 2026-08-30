import type { ShoppingItem } from '@/domain/schemas/shopping';
import { normaliseRetailerText } from './manual';
import type { ProductPreference, RetailerProduct } from './schemas';
import type { ShoppingProvider, TrolleyLine } from './types';

export interface ProductPreferenceReader {
  getPreferredProduct(itemKey: string, retailer: 'new-world', storeId?: string): Promise<ProductPreference | undefined>;
}

function tokens(value: string): Set<string> {
  return new Set(normaliseRetailerText(value).split(' ').filter(Boolean));
}

const PRODUCT_FORM_TOKENS = new Set([
  'bites', 'chips', 'crackers', 'dip', 'flavour', 'flavoured', 'powder', 'sauce', 'snack', 'snacks',
]);

/** Reject category/search links that a retailer page presents beside real product cards. */
export function isSpecificNewWorldProduct(product: RetailerProduct): boolean {
  if (/^(view|see|shop) all\b/i.test(product.name.trim())) return false;
  if (!product.productUrl) return Boolean(product.externalProductId);
  try {
    const url = new URL(product.productUrl);
    return (url.hostname === 'newworld.co.nz' || url.hostname.endsWith('.newworld.co.nz')) &&
      /\/shop\/product\//i.test(url.pathname);
  } catch {
    return false;
  }
}

/** Prevent a remembered ingredient from silently resolving to a snack or condiment with that flavour. */
export function isPlausibleProductForItem(itemName: string, product: RetailerProduct): boolean {
  const requested = tokens(itemName);
  const candidate = tokens([product.brand, product.name, product.size].filter(Boolean).join(' '));
  const conflictingForm = [...PRODUCT_FORM_TOKENS].some((token) => candidate.has(token) && !requested.has(token));
  return !conflictingForm && rankProduct(itemName, product) >= 0.55;
}

export function rankProduct(query: string, product: RetailerProduct): number {
  const queryNormal = normaliseRetailerText(query);
  const productNormal = normaliseRetailerText([product.brand, product.name, product.size].filter(Boolean).join(' '));
  if (queryNormal === productNormal || normaliseRetailerText(product.name) === queryNormal) return 0.98;
  if (productNormal.includes(queryNormal)) return 0.9;
  const requested = tokens(query);
  const candidate = tokens(productNormal);
  const overlap = [...requested].filter((token) => candidate.has(token)).length;
  return requested.size === 0 ? 0 : Math.min(0.89, 0.35 + (overlap / requested.size) * 0.5);
}

export async function resolveShoppingItem(
  item: ShoppingItem,
  provider: ShoppingProvider,
  preferences?: ProductPreferenceReader,
  storeId?: string,
): Promise<TrolleyLine> {
  const shoppingItem = { id: item.id, name: item.name, quantity: item.quantity, unit: item.unit };
  const preference = await preferences?.getPreferredProduct(normaliseRetailerText(item.name), 'new-world', storeId);
  if (preference) {
    const unavailable = preference.product.availability === 'unavailable';
    const executable = isSpecificNewWorldProduct(preference.product);
    const plausible = isPlausibleProductForItem(item.name, preference.product);
    const paused = !preference.enabled;
    return {
      shoppingItem,
      requestedText: item.name,
      requestedQuantity: item.quantity,
      product: preference.product,
      confidence: unavailable ? 0 : preference.confidence,
      source: 'household-preference',
      status: unavailable ? 'unavailable' : executable && plausible && !paused ? 'ready' : 'needs-review',
      requiresReview: unavailable || !executable || !plausible || paused,
      preferenceEnabled: preference.enabled,
      reason: unavailable ? 'Your saved product is unavailable; choose a replacement.'
        : paused ? 'Automatic use of this saved product is paused.'
          : !executable ? 'The saved choice is not a specific New World product. Choose a replacement.'
            : !plausible ? 'The saved product no longer looks like the requested item. Choose a replacement.'
              : undefined,
    };
  }

  let found: RetailerProduct[] = [];
  try {
    found = await provider.search(item.name, storeId);
  } catch (error) {
    return {
      shoppingItem, requestedText: item.name, requestedQuantity: item.quantity, confidence: 0,
      source: 'unresolved', status: 'needs-review', requiresReview: true,
      reason: error instanceof Error && error.message.includes('security check')
        ? error.message
        : 'The New World product search could not run. Check the companion and retry.',
    };
  }
  const candidates = found
    .map((product) => ({ product, score: rankProduct(item.name, product) }))
    .sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) return {
    shoppingItem, requestedText: item.name, requestedQuantity: item.quantity, confidence: 0,
    source: 'unresolved', status: 'needs-review', requiresReview: true,
    reason: 'No product match was found.',
  };

  const unavailable = best.product.availability === 'unavailable';
  const ready = best.score >= 0.86 && !unavailable;
  return {
    shoppingItem,
    requestedText: item.name,
    requestedQuantity: item.quantity,
    product: best.product,
    candidates: candidates.slice(0, 5).map(({ product }) => product),
    confidence: best.score,
    source: best.score >= 0.97 ? 'exact-match' : 'ranked-candidate',
    status: unavailable ? 'unavailable' : ready ? 'ready' : 'needs-review',
    requiresReview: !ready,
    reason: unavailable ? 'Matched product is unavailable.' : ready ? undefined : 'Match confidence is too low; choose a product.',
  };
}
