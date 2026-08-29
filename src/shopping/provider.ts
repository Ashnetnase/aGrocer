import { ManualShoppingProvider } from './manual';
import { NewWorldShoppingProvider } from './newWorld';
import type { ShoppingProvider } from './types';

const globalForShopping = globalThis as typeof globalThis & { __agrocerShoppingProvider?: ShoppingProvider };

export function getShoppingProvider(): ShoppingProvider {
  if (globalForShopping.__agrocerShoppingProvider) return globalForShopping.__agrocerShoppingProvider;
  const name = process.env.SHOPPING_PROVIDER ?? 'manual';
  const provider = name === 'manual' ? new ManualShoppingProvider() : name === 'new-world' ? new NewWorldShoppingProvider() : undefined;
  if (!provider) throw new Error(`SHOPPING_PROVIDER="${name}" is not implemented.`);
  globalForShopping.__agrocerShoppingProvider = provider;
  return provider;
}

export function resetShoppingProvider(): void {
  globalForShopping.__agrocerShoppingProvider = undefined;
}
