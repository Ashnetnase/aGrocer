/**
 * Typo-tolerant "does this text match this search query" check, shared by every in-app search
 * box (products, pantry, meals). An exact substring always matches; beyond that, each query word
 * only needs to be close to some word in the text — a prefix, or a small edit distance — so a
 * misspelled "chiken" still finds "Chicken breast".
 *
 * Deliberately not used for New World retailer matching (`src/shopping/matching.ts`): that engine
 * decides what is safe to add to a real trolley automatically, and stays exact/token-overlap on
 * purpose (ADR-022 area) rather than tolerating typos in what gets bought.
 */

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current.push(Math.min(current[j - 1]! + 1, previous[j]! + 1, previous[j - 1]! + cost));
    }
    previous = current;
  }
  return previous[b.length]!;
}

/** Shorter words tolerate fewer typos, so "to" does not match half the dictionary. */
function tolerance(word: string): number {
  if (word.length <= 3) return 0;
  if (word.length <= 6) return 1;
  return 2;
}

const splitWords = (value: string): string[] => value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** True when every word in `query` is a substring of, or a close typo of, some word in `text`. */
export function fuzzyMatch(text: string, query: string): boolean {
  const normalisedQuery = query.trim().toLowerCase();
  if (normalisedQuery === '') return true;
  if (text.toLowerCase().includes(normalisedQuery)) return true;

  const queryWords = splitWords(normalisedQuery);
  if (queryWords.length === 0) return true;
  const textWords = splitWords(text);
  if (textWords.length === 0) return false;

  return queryWords.every((queryWord) =>
    textWords.some(
      (textWord) => textWord.includes(queryWord) || levenshtein(textWord, queryWord) <= tolerance(queryWord),
    ),
  );
}
