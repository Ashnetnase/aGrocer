import { and, eq } from 'drizzle-orm';
import type { Database } from '@/db/client';
import { retailerProducts, shoppingProductPreferences } from '@/db/schema';
import type { ProductPreference, RetailerProduct } from './schemas';
import { normaliseRetailerText } from './manual';

export interface ShoppingProductRepository {
  getPreferredProduct(itemKey: string, retailer: 'new-world', storeId?: string): Promise<ProductPreference | undefined>;
  savePreferredProduct(itemKey: string, product: RetailerProduct, defaultQuantity: number, confidence?: number): Promise<ProductPreference>;
  removePreferredProduct(itemKey: string, retailer: 'new-world', storeId?: string): Promise<void>;
  setPreferenceEnabled(itemKey: string, retailer: 'new-world', enabled: boolean, storeId?: string): Promise<ProductPreference | undefined>;
  saveProduct(product: RetailerProduct): Promise<RetailerProduct>;
}

const cents = (value: number | undefined) => value === undefined ? null : Math.round(value * 100);
const money = (value: number | null) => value === null ? undefined : value / 100;

function toProduct(row: typeof retailerProducts.$inferSelect): RetailerProduct {
  return {
    id: row.id,
    retailer: 'new-world',
    name: row.name,
    availability: row.availability === 'available' || row.availability === 'unavailable' ? row.availability : 'unknown',
    ...(row.storeId ? { storeId: row.storeId } : {}),
    ...(row.externalProductId ? { externalProductId: row.externalProductId } : {}),
    ...(row.brand ? { brand: row.brand } : {}),
    ...(row.size ? { size: row.size } : {}),
    ...(row.unit ? { unit: row.unit } : {}),
    ...(money(row.priceCents) === undefined ? {} : { price: money(row.priceCents) }),
    ...(money(row.specialPriceCents) === undefined ? {} : { specialPrice: money(row.specialPriceCents) }),
    ...(row.productUrl ? { productUrl: row.productUrl } : {}),
    ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}),
    ...(row.lastSeenAt ? { lastSeenAt: row.lastSeenAt.toISOString() } : {}),
  };
}

export function createShoppingProductRepository(db: Database, householdId: string): ShoppingProductRepository {
  async function findProduct(product: RetailerProduct) {
    const rows = await db.select().from(retailerProducts).where(and(
      eq(retailerProducts.householdId, householdId),
      eq(retailerProducts.retailer, product.retailer),
    ));
    return rows.find((row) =>
      (product.externalProductId && row.externalProductId === product.externalProductId && row.storeId === (product.storeId ?? null)) ||
      (product.productUrl && row.productUrl === product.productUrl));
  }

  const repository: ShoppingProductRepository = {
    async getPreferredProduct(itemKey, retailer, storeId) {
      const rows = await db.select().from(shoppingProductPreferences).where(and(
        eq(shoppingProductPreferences.householdId, householdId),
        eq(shoppingProductPreferences.shoppingItemKey, normaliseRetailerText(itemKey)),
        eq(shoppingProductPreferences.retailer, retailer),
      ));
      const row = rows.find((candidate) => candidate.storeId === (storeId ?? null));
      if (!row) return undefined;
      const productRow = row.retailerProductId
        ? (await db.select().from(retailerProducts).where(and(eq(retailerProducts.id, row.retailerProductId), eq(retailerProducts.householdId, householdId))).limit(1))[0]
        : undefined;
      const product: RetailerProduct = productRow ? toProduct(productRow) : {
        retailer: 'new-world', name: row.productName, availability: 'unknown',
        ...(row.storeId ? { storeId: row.storeId } : {}),
        ...(row.externalProductId ? { externalProductId: row.externalProductId } : {}),
        ...(row.brand ? { brand: row.brand } : {}),
        ...(row.size ? { size: row.size } : {}),
        ...(row.productUrl ? { productUrl: row.productUrl } : {}),
      };
      return {
        id: row.id,
        shoppingItemKey: row.shoppingItemKey,
        retailer: 'new-world',
        product,
        defaultQuantity: row.defaultQuantity,
        confidence: row.confidenceBasisPoints / 10_000,
        enabled: row.enabled,
        lastConfirmedAt: row.lastConfirmedAt.toISOString(),
        ...(row.storeId ? { storeId: row.storeId } : {}),
      };
    },

    async saveProduct(product) {
      const existing = await findProduct(product);
      const values = {
        retailer: product.retailer, storeId: product.storeId ?? null,
        externalProductId: product.externalProductId ?? null, name: product.name,
        brand: product.brand ?? null, size: product.size ?? null, unit: product.unit ?? null,
        priceCents: cents(product.price), specialPriceCents: cents(product.specialPrice),
        productUrl: product.productUrl ?? null, imageUrl: product.imageUrl ?? null,
        availability: product.availability, lastSeenAt: product.lastSeenAt ? new Date(product.lastSeenAt) : new Date(),
        updatedAt: new Date(),
      };
      const [row] = existing
        ? await db.update(retailerProducts).set(values).where(and(eq(retailerProducts.id, existing.id), eq(retailerProducts.householdId, householdId))).returning()
        : await db.insert(retailerProducts).values({ householdId, ...values }).returning();
      if (!row) throw new Error('Saving retailer product returned no row');
      return toProduct(row);
    },

    async savePreferredProduct(itemKey, product, defaultQuantity, confidence = 1) {
      const saved = await repository.saveProduct(product);
      if (!saved.id) throw new Error('Saved retailer product has no id');
      const key = normaliseRetailerText(itemKey);
      const existing = await repository.getPreferredProduct(key, product.retailer, product.storeId);
      const values = {
        shoppingItemKey: key, retailer: product.retailer, storeId: product.storeId ?? null,
        retailerProductId: saved.id, externalProductId: product.externalProductId ?? null,
        productName: product.name, brand: product.brand ?? null, size: product.size ?? null,
        productUrl: product.productUrl ?? null, defaultQuantity,
        confidenceBasisPoints: Math.round(Math.max(0, Math.min(1, confidence)) * 10_000),
        enabled: true,
        lastConfirmedAt: new Date(), updatedAt: new Date(),
      };
      const [row] = existing?.id
        ? await db.update(shoppingProductPreferences).set(values).where(and(eq(shoppingProductPreferences.id, existing.id), eq(shoppingProductPreferences.householdId, householdId))).returning()
        : await db.insert(shoppingProductPreferences).values({ householdId, ...values }).returning();
      if (!row) throw new Error('Saving product preference returned no row');
      const preference = await repository.getPreferredProduct(key, product.retailer, product.storeId);
      if (!preference) throw new Error('Saved product preference could not be read');
      return preference;
    },

    async removePreferredProduct(itemKey, retailer, storeId) {
      const existing = await repository.getPreferredProduct(itemKey, retailer, storeId);
      if (!existing?.id) return;
      await db.delete(shoppingProductPreferences).where(and(
        eq(shoppingProductPreferences.id, existing.id),
        eq(shoppingProductPreferences.householdId, householdId),
      ));
    },

    async setPreferenceEnabled(itemKey, retailer, enabled, storeId) {
      const existing = await repository.getPreferredProduct(itemKey, retailer, storeId);
      if (!existing?.id) return undefined;
      await db.update(shoppingProductPreferences).set({ enabled, updatedAt: new Date() }).where(and(
        eq(shoppingProductPreferences.id, existing.id),
        eq(shoppingProductPreferences.householdId, householdId),
      ));
      return repository.getPreferredProduct(itemKey, retailer, storeId);
    },
  };
  return repository;
}
