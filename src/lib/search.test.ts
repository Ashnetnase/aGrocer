import { describe, expect, it } from 'vitest';
import { fuzzyMatch } from './search';

describe('fuzzyMatch', () => {
  it('matches an exact substring', () => {
    expect(fuzzyMatch('Chicken breast', 'chicken')).toBe(true);
  });

  it('tolerates a small typo in a longer word', () => {
    expect(fuzzyMatch('Chicken breast', 'chiken')).toBe(true);
    expect(fuzzyMatch('Spaghetti Bolognese', 'spagetti')).toBe(true);
  });

  it('does not match an unrelated word', () => {
    expect(fuzzyMatch('Chicken breast', 'banana')).toBe(false);
  });

  it('requires every query word to match something', () => {
    expect(fuzzyMatch('Beef mince 500g', 'beef mince')).toBe(true);
    expect(fuzzyMatch('Beef mince 500g', 'beef onion')).toBe(false);
  });

  it('treats an empty query as matching everything', () => {
    expect(fuzzyMatch('Anything', '')).toBe(true);
    expect(fuzzyMatch('Anything', '   ')).toBe(true);
  });

  it('does not tolerate typos in very short words, to avoid over-matching', () => {
    expect(fuzzyMatch('Tofu stir fry', 'tea')).toBe(false);
  });
});
