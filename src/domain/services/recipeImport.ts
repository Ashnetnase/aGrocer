import type { MealIngredient } from '../schemas/meal';

/**
 * Recipe import from pasted text (Stage 4).
 *
 * Turns whatever somebody copied out of a website or a message into a draft they then
 * **review and correct** before saving. It is a head start, not an oracle.
 *
 * **Pasted text rather than a fetched URL**, deliberately. Fetching would mean the server
 * requesting arbitrary addresses, and this app now runs on a home network alongside
 * Vaultwarden, Proxmox and an unauthenticated Ollama — textbook SSRF territory. Recipe pages
 * are also hostile to parse. Pasting costs the family one extra gesture and removes the whole
 * class of problem. A URL fetch can be added later behind an allow-list if it earns its place.
 *
 * **Nothing is invented and nothing is silently dropped.** A line that cannot be understood
 * goes into `unparsed` and is shown, rather than being guessed at or thrown away — the same
 * rule the assistant follows about household data. A wrong ingredient quietly added to a
 * recipe is worse than a line the person has to retype.
 *
 * Ingredients in recipes are written **amount first** ("500g beef mince"), which is the
 * opposite of how they are stored here ("Beef mince 500g"). That inversion is most of the
 * work; `parseMealIngredient` in `meals.ts` handles the stored direction and is left alone.
 */

export interface ImportedRecipe {
  name?: string;
  minutes?: number;
  serves?: number;
  description?: string;
  ingredients: MealIngredient[];
  /** Lines that looked like ingredients but could not be read. Never discarded silently. */
  unparsed: string[];
}

/** Units worth recognising. Anything else becomes part of the name rather than being forced. */
const UNITS = [
  'g', 'kg', 'mg',
  'ml', 'l', 'litre', 'litres', 'liter', 'liters',
  'tsp', 'teaspoon', 'teaspoons',
  'tbsp', 'tablespoon', 'tablespoons',
  'cup', 'cups',
  'oz', 'lb', 'lbs',
  'clove', 'cloves',
  'slice', 'slices',
  'can', 'cans', 'tin', 'tins',
  'pack', 'packs', 'packet', 'packets',
  'bunch', 'bunches',
  'pinch', 'pinches',
  'handful', 'handfuls',
  'punnet', 'punnets',
];

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

/** Headings and list bullets that carry no information once the section is known. */
const BULLET = /^[\s]*[-*•▢□○●·–—]+\s*/;

function stripBullet(line: string): string {
  return line.replace(BULLET, '').trim();
}

/**
 * Reads a leading quantity: `2`, `1.5`, `1/2`, `½`, or `1 1/2`.
 *
 * Returns the amount and what is left of the line. Rounded to three places because
 * `1/3` is otherwise stored as seventeen digits nobody wants to see in an input.
 */
function takeAmount(text: string): { amount: number; rest: string } | undefined {
  const mixed = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*(.*)$/);
  if (mixed) {
    const [, whole, num, den, rest] = mixed;
    const d = Number(den);
    if (d === 0) return undefined;
    return { amount: round(Number(whole) + Number(num) / d), rest: rest ?? '' };
  }

  const fraction = text.match(/^(\d+)\s*\/\s*(\d+)\s*(.*)$/);
  if (fraction) {
    const [, num, den, rest] = fraction;
    const d = Number(den);
    if (d === 0) return undefined;
    return { amount: round(Number(num) / d), rest: rest ?? '' };
  }

  const unicode = text.match(/^([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*(.*)$/);
  if (unicode?.[1]) {
    return { amount: UNICODE_FRACTIONS[unicode[1]] ?? 1, rest: unicode[2] ?? '' };
  }

  // A range — "2-3 apples" — takes the lower bound. Guessing high puts food in the bin.
  const decimal = text.match(/^(\d+(?:\.\d+)?)(?:\s*[-–]\s*\d+(?:\.\d+)?)?\s*(.*)$/);
  if (decimal?.[1]) {
    return { amount: round(Number(decimal[1])), rest: decimal[2] ?? '' };
  }

  return undefined;
}

const round = (value: number): number => Math.round(value * 1000) / 1000;

/**
 * Reads one ingredient line, written amount-first.
 *
 * Returns `undefined` when there is nothing usable, so the caller can surface the line rather
 * than inventing an ingredient from it.
 */
export function parseImportedIngredient(line: string): MealIngredient | undefined {
  let text = stripBullet(line);
  if (text === '') return undefined;

  // Preparation notes after a comma are for the cook, not the shopping list:
  // "1 onion, finely diced" is one onion.
  const comma = text.indexOf(',');
  if (comma > 0) text = text.slice(0, comma).trim();

  // Parenthetical asides likewise — "(about 2 cups)".
  text = text.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (text === '') return undefined;

  const taken = takeAmount(text);

  if (!taken) {
    // No quantity at all — "Salt and pepper", "Olive oil". Real ingredients, so they are
    // kept at one unit rather than dropped; the person can correct the amount.
    if (!/[a-z]/i.test(text)) return undefined;
    return { name: titleCase(text), amount: 1, unit: 'item' };
  }

  let rest = taken.rest.trim();
  let unit = 'item';

  const firstWord = rest.split(/\s+/)[0]?.toLowerCase().replace(/\.$/, '') ?? '';
  if (UNITS.includes(firstWord)) {
    unit = firstWord;
    rest = rest.slice(rest.indexOf(rest.split(/\s+/)[0] ?? '') + (rest.split(/\s+/)[0]?.length ?? 0)).trim();
  } else {
    // "500g beef mince" — the unit is glued to the number, so it landed at the front of rest.
    const glued = rest.match(/^([a-z]+)\s+(.*)$/i);
    if (glued?.[1] && UNITS.includes(glued[1].toLowerCase())) {
      unit = glued[1].toLowerCase();
      rest = glued[2] ?? '';
    }
  }

  // "of" survives "2 cups of rice" and belongs to neither field.
  rest = rest.replace(/^of\s+/i, '').trim();

  if (rest === '') return undefined;
  return { name: titleCase(rest), amount: taken.amount, unit };
}

/** Recipes arrive in every casing; the app stores names sentence-style. */
function titleCase(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (cleaned === '') return cleaned;
  // Only fix the obviously-shouted case; leave "Beef mince" and "beef mince" alone otherwise.
  const body = cleaned === cleaned.toUpperCase() ? cleaned.toLowerCase() : cleaned;
  return body.charAt(0).toUpperCase() + body.slice(1);
}

const SERVES = /\b(?:serves|servings?|yields?|makes)\b\D{0,10}?(\d+)/i;
const SERVES_TRAILING = /(\d+)\s*servings?\b/i;
const MINUTES = /(\d+)\s*(?:minutes?|mins?\b)/gi;
const HOURS = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?\b)/gi;

/** Section headings that mean "ingredients follow" / "ingredients have ended". */
const INGREDIENTS_HEADING = /^\s*ingredients?\s*:?\s*$/i;
const METHOD_HEADING = /^\s*(?:method|instructions?|directions?|steps?|preparation)\s*:?\s*$/i;

/**
 * Splits pasted text into a reviewable draft.
 *
 * Where a recipe marks its ingredients with a heading, only that section is read — which is
 * what stops method prose ("Cook for 20 minutes") becoming an ingredient. Without a heading
 * the parser falls back to "lines that begin with a quantity", which is conservative: it will
 * miss unquantified ingredients rather than inventing quantified ones.
 */
export function importRecipeText(text: string): ImportedRecipe {
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.map((line) => line.trim()).filter((line) => line !== '');
  if (nonEmpty.length === 0) return { ingredients: [], unparsed: [] };

  const headingIndex = lines.findIndex((line) => INGREDIENTS_HEADING.test(line));
  const methodIndex = lines.findIndex(
    (line, index) => index > headingIndex && METHOD_HEADING.test(line),
  );

  let candidates: string[];
  if (headingIndex >= 0) {
    const end = methodIndex > headingIndex ? methodIndex : lines.length;
    candidates = lines.slice(headingIndex + 1, end);
  } else {
    // No heading: only lines that start with a quantity or a bullet are plausibly ingredients.
    candidates = lines.filter((line) => {
      const stripped = stripBullet(line);
      return stripped !== '' && /^[\d½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/.test(stripped);
    });
  }

  const ingredients: MealIngredient[] = [];
  const unparsed: string[] = [];
  for (const line of candidates) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    const parsed = parseImportedIngredient(trimmed);
    if (parsed) ingredients.push(parsed);
    else unparsed.push(trimmed);
  }

  // The title is the first line, unless that line is itself a heading or an ingredient.
  const firstLine = nonEmpty[0];
  const name =
    firstLine &&
    !INGREDIENTS_HEADING.test(firstLine) &&
    !METHOD_HEADING.test(firstLine) &&
    !/^[\d½⅓⅔¼¾]/.test(stripBullet(firstLine))
      ? titleCase(firstLine.replace(/^#+\s*/, ''))
      : undefined;

  return {
    name: name && name.length <= 80 ? name : undefined,
    serves: readServes(text),
    minutes: readMinutes(text),
    ingredients,
    unparsed,
  };
}

function readServes(text: string): number | undefined {
  const match = SERVES.exec(text) ?? SERVES_TRAILING.exec(text);
  const value = match?.[1] ? Number(match[1]) : undefined;
  return value && value >= 1 && value <= 20 ? value : undefined;
}

/**
 * Totals every duration mentioned, because recipes routinely split prep from cook.
 * "Prep 10 mins, cook 25 mins" is a 35-minute meal, and that is the number the planner wants.
 */
function readMinutes(text: string): number | undefined {
  let total = 0;
  for (const match of text.matchAll(MINUTES)) total += Number(match[1] ?? 0);
  for (const match of text.matchAll(HOURS)) total += Number(match[1] ?? 0) * 60;
  const rounded = Math.round(total);
  return rounded >= 1 && rounded <= 600 ? rounded : undefined;
}
