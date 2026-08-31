export interface SpecialOffer {
  productName: string;
  retailer: string;
  price: number;
  regularPrice?: number;
  validUntil?: string;
  sourceUrl?: string;
}

export interface SpecialsProvider {
  readonly name: string;
  search(query: string): Promise<SpecialOffer[]>;
}
