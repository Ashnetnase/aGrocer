import type { Metadata } from 'next';
import { ProductsScreen } from '@/features/products/ProductsScreen';

export const metadata: Metadata = { title: 'Products · Agrocer' };

export default function ProductsPage() {
  return <ProductsScreen />;
}
