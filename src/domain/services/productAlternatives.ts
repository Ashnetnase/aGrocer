import type { Product } from '../schemas/product';

/** Returns catalogue alternatives without contacting a supermarket or changing a list. */
export function findProductAlternatives(product: Product, catalogue: Product[], limit = 3): Product[] {
  const tokens = new Set(product.name.toLowerCase().split(/\s+/).filter((token) => token.length > 2));
  return catalogue
    .filter((candidate) => candidate.id !== product.id && candidate.category === product.category)
    .map((candidate) => ({ candidate, score: score(candidate, tokens, product) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.price - b.candidate.price)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

function score(candidate: Product, tokens: Set<string>, product: Product): number {
  const name = candidate.name.toLowerCase();
  const shared = [...tokens].filter((token) => name.includes(token)).length;
  const brand = candidate.brand.toLowerCase() === product.brand.toLowerCase() ? 1 : 0;
  return shared * 2 + brand;
}
