import { z } from 'zod';

export const retailerSchema = z.literal('new-world');
export const availabilitySchema = z.enum(['available', 'unavailable', 'unknown']);

export const retailerProductSchema = z.object({
  id: z.string().uuid().optional(),
  retailer: retailerSchema,
  storeId: z.string().trim().min(1).max(100).optional(),
  externalProductId: z.string().trim().min(1).max(200).optional(),
  name: z.string().trim().min(1).max(300),
  brand: z.string().trim().max(120).optional(),
  size: z.string().trim().max(80).optional(),
  unit: z.string().trim().max(40).optional(),
  price: z.number().nonnegative().optional(),
  specialPrice: z.number().nonnegative().optional(),
  productUrl: z.string().url().max(2_000).optional(),
  imageUrl: z.string().url().max(2_000).optional(),
  availability: availabilitySchema.default('unknown'),
  lastSeenAt: z.string().datetime().optional(),
});
export type RetailerProduct = z.infer<typeof retailerProductSchema>;
export const retailerProductBatchSchema = z.object({
  products: z.array(retailerProductSchema).min(1).max(40),
});

export const productPreferenceSchema = z.object({
  id: z.string().uuid().optional(),
  shoppingItemKey: z.string().trim().min(1).max(200),
  retailer: retailerSchema,
  storeId: z.string().trim().min(1).max(100).optional(),
  product: retailerProductSchema,
  defaultQuantity: z.number().int().min(1).max(99).default(1),
  confidence: z.number().min(0).max(1).default(1),
  enabled: z.boolean().default(true),
  lastConfirmedAt: z.string().datetime(),
});
export type ProductPreference = z.infer<typeof productPreferenceSchema>;

export const trolleyAddItemSchema = z.object({
  shoppingItemId: z.string().min(1).max(200),
  productUrl: z.string().url().max(2_000).optional(),
  externalProductId: z.string().min(1).max(200).optional(),
  expectedName: z.string().trim().min(1).max(300),
  quantity: z.number().int().min(1).max(99),
}).refine((item) => item.productUrl || item.externalProductId, {
  message: 'A product URL or external product id is required',
});

export const trolleyAddBatchSchema = z.object({ items: z.array(trolleyAddItemSchema).min(1).max(100) });
export type TrolleyAddItem = z.infer<typeof trolleyAddItemSchema>;

export const trolleyAddStatusSchema = z.enum([
  'added', 'needs-login', 'product-not-found', 'product-unavailable', 'selector-failed',
  'quantity-mismatch', 'requires-review', 'blocked', 'unknown-error',
]);
export type TrolleyAddStatus = z.infer<typeof trolleyAddStatusSchema>;

export const trolleyAddResultSchema = z.object({
  shoppingItemId: z.string(),
  status: trolleyAddStatusSchema,
  requestedQuantity: z.number().int(),
  confirmedQuantity: z.number().int().nonnegative().optional(),
  confirmedProductName: z.string().optional(),
  message: z.string().optional(),
});
export type TrolleyAddResult = z.infer<typeof trolleyAddResultSchema>;

export const trolleyJobStatusSchema = z.enum(['pending', 'processing', 'completed', 'attention', 'dismissed']);
export const trolleyJobSchema = z.object({
  id: z.string().uuid(), retailer: retailerSchema, status: trolleyJobStatusSchema,
  items: z.array(trolleyAddItemSchema), results: z.array(trolleyAddResultSchema).optional(),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(), completedAt: z.string().datetime().optional(),
});
export type TrolleyJob = z.infer<typeof trolleyJobSchema>;

export const retailerSearchJobStatusSchema = z.enum(['pending', 'processing', 'completed', 'attention', 'dismissed']);
export const retailerProductSearchJobSchema = z.object({
  id: z.string().uuid(),
  retailer: retailerSchema,
  shoppingItemId: z.string().min(1).max(200),
  shoppingItemKey: z.string().min(1).max(200),
  query: z.string().min(1).max(120),
  storeId: z.string().max(100).optional(),
  status: retailerSearchJobStatusSchema,
  products: z.array(retailerProductSchema).optional(),
  message: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});
export type RetailerProductSearchJob = z.infer<typeof retailerProductSearchJobSchema>;
