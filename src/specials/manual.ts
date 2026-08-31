import type { SpecialOffer, SpecialsProvider } from './types';

/** Safe default provider: no retailer calls, credentials, or inferred prices. */
export class ManualSpecialsProvider implements SpecialsProvider {
  readonly name = 'manual';
  constructor(private readonly offers: SpecialOffer[] = []) {}

  async search(query: string): Promise<SpecialOffer[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return this.offers.filter((offer) => offer.productName.toLowerCase().includes(needle)).sort((a, b) => a.price - b.price);
  }
}
