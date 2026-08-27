import type { Product, ProductPatch } from '@/domain/schemas/product';
import type { ProductsRepository } from '@/data/repositories/types';
import { patch, request } from './client';

/** The product catalogue over HTTP (ADR-003). */

const BASE = '/api/products';

export const apiProductsRepository: ProductsRepository = {
  async list() {
    const { products } = await request<{ products: Product[] }>(BASE);
    return products;
  },

  async update(id: string, productPatch: ProductPatch) {
    return patch<Product>(`${BASE}/${id}`, productPatch, 'product');
  },

  async toggleFavourite(id: string) {
    return patch<Product>(`${BASE}/${id}`, { toggleFavourite: true }, 'product');
  },
};
