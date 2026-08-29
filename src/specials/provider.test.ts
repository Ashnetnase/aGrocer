import { afterEach, describe, expect, it } from 'vitest';
import { getSpecialsProvider, resetSpecialsProvider } from './provider';

afterEach(() => {
  delete process.env.SPECIALS_PROVIDER;
  resetSpecialsProvider();
});

describe('getSpecialsProvider', () => {
  it('defaults to the safe manual provider', () => {
    expect(getSpecialsProvider().name).toBe('manual');
  });
  it('refuses an unimplemented provider', () => {
    process.env.SPECIALS_PROVIDER = 'new-world';
    expect(() => getSpecialsProvider()).toThrow(/not implemented/);
  });
});
