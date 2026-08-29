import { ManualSpecialsProvider } from './manual';
import type { SpecialsProvider } from './types';

const globalForSpecials = globalThis as typeof globalThis & { __agrocerSpecialsProvider?: SpecialsProvider };

export function getSpecialsProvider(): SpecialsProvider {
  if (globalForSpecials.__agrocerSpecialsProvider) return globalForSpecials.__agrocerSpecialsProvider;
  const name = process.env.SPECIALS_PROVIDER ?? 'manual';
  if (name !== 'manual') throw new Error(`SPECIALS_PROVIDER="${name}" is not implemented.`);
  const provider = new ManualSpecialsProvider();
  globalForSpecials.__agrocerSpecialsProvider = provider;
  return provider;
}

export function resetSpecialsProvider(): void {
  globalForSpecials.__agrocerSpecialsProvider = undefined;
}
