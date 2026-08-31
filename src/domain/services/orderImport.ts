/**
 * Parses a pasted New World order confirmation/invoice into reviewable line items (Stage 5).
 *
 * Nothing here is saved directly — `OrderImportSheet` shows the result for a person to check
 * and correct before anything is written, the same review-before-write shape as recipe import.
 *
 * **Never reads customer details.** A pasted invoice carries a name, delivery address, phone
 * number, order/invoice numbers and a GST number. None of that matches the product-line shape
 * this parser looks for, so none of it is extracted — but that is worth stating explicitly,
 * because it is the reason this parser is safe to point at a real household's invoice text.
 *
 * The invoice text is a flattened table: each product line ends with an ordered quantity, a
 * supplied quantity, a unit price and a line total, each written to two decimal places, then
 * one or more repeated unit words. A line with `suppliedQuantity` of `0` was ordered but never
 * received (out of stock) — it is skipped, since nothing was actually bought.
 *
 * `parseNewWorldOrderBatch` handles several invoices pasted together (a bulk export, or a run of
 * order-confirmation emails), splitting on each new "Tax Invoice" number and parsing each order
 * with its own date — a multi-page invoice repeats the same number per page and stays one order.
 */

export interface ParsedOrderLine {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface ImportedOrder {
  /** ISO `yyyy-mm-dd`, from the first invoice/delivery date found. `undefined` if none was. */
  orderedOn?: string;
  lines: ParsedOrderLine[];
  /** Lines that looked like a priced line but did not fit the expected shape. Never guessed at. */
  unparsed: string[];
}

const DATE_LINE = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const SUBSTITUTE_PREFIX = /^\(sub\)\s*/i;
const MONEY = /\d+\.\d{2}\b/;

/**
 * `<name> [unit] <ordered> <supplied> <unitPrice> <total> <unit words…>`
 *
 * The unit word before the quantities ("kg", "ea") is only present for items sold by weight;
 * each-sold items fold their size into the name instead ("Pams Standard Milk 3l").
 */
const PRODUCT_LINE =
  /^(.+?)\s+(?:(kg|g|ea|l|ml)\s+)?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+\S.*$/i;

/**
 * A substituted item is printed once, with a single quantity rather than an ordered/supplied
 * pair — the ordered/out-of-stock original was already its own (skipped) line above it.
 */
const SUBSTITUTE_LINE =
  /^(.+?)\s+(?:(kg|g|ea|l|ml)\s+)?(\d+(?:\.\d+)?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+\S.*$/i;

/** Priced summary/footer lines that are not products, so a money-looking line does not become "unparsed" noise. */
const KNOWN_BOILERPLATE =
  /\b(sub[\s-]?total|amount tendered|club\+? savings|bag fee|collection fee|incl\.?\s*gst|gst number|liquor licen[cs]e|expiry date)\b|^total\s+\d/i;

/** A standalone price with nothing else on the line — a fee footer's amount column, printed alone. */
const BARE_PRICE = /^\$?\d+\.\d{2}$/;

/**
 * An out-of-stock item printed with only its ordered quantity and (sometimes) what it would have
 * cost — never a real purchase, so unlike a genuinely unreadable line this is skipped silently
 * rather than surfaced for review. `PRODUCT_LINE`/`SUBSTITUTE_LINE` already catch the normal
 * two-price shape of these when `supplied` is `0`; this covers the shorter one-price variant a
 * shortfall summary sometimes uses instead.
 */
const OUT_OF_STOCK_ECHO = /^(.+?)\s+(?:(kg|g|ea|l|ml)\s+)?(\d+(?:\.\d+)?)\s+0\s+\d+(?:\.\d+)?\b.*$/i;

const round = (value: number): number => Math.round(value * 1000) / 1000;

export function parseNewWorldOrderText(text: string): ImportedOrder {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const dateLine = lines.find((line) => DATE_LINE.test(line));
  const dateMatch = dateLine ? DATE_LINE.exec(dateLine) : null;
  const orderedOn = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : undefined;

  const parsed: ParsedOrderLine[] = [];
  const unparsed: string[] = [];

  for (const line of lines) {
    if (DATE_LINE.test(line)) continue;

    const isSubstitute = SUBSTITUTE_PREFIX.test(line);
    const withoutPrefix = line.replace(SUBSTITUTE_PREFIX, '');

    // `supplied`/`total` differ in meaning but not in what they resolve to: the substitute
    // pattern's single quantity is what was actually received, exactly like `suppliedQuantity`.
    const fields = isSubstitute
      ? (() => {
          const match = SUBSTITUTE_LINE.exec(withoutPrefix);
          return match && { name: match[1], unitWord: match[2], supplied: match[3], unitPrice: match[4], total: match[5] };
        })()
      : (() => {
          const match = PRODUCT_LINE.exec(withoutPrefix);
          return match && { name: match[1], unitWord: match[2], supplied: match[4], unitPrice: match[5], total: match[6] };
        })();

    if (fields) {
      const supplied = Number(fields.supplied);
      const total = Number(fields.total);
      const name = (fields.name ?? '').trim();
      // A supplied quantity of 0 means it was ordered but out of stock — nothing was bought.
      if (supplied > 0 && total > 0 && name && name.length <= 200) {
        parsed.push({
          name,
          quantity: round(supplied),
          unit: (fields.unitWord ?? 'ea').toLowerCase(),
          unitPrice: Number(fields.unitPrice),
          totalPrice: total,
        });
      }
      continue;
    }

    if (BARE_PRICE.test(line) || KNOWN_BOILERPLATE.test(line) || OUT_OF_STOCK_ECHO.test(line)) continue;
    if (MONEY.test(line)) unparsed.push(line);
  }

  return { orderedOn, lines: parsed, unparsed };
}

/** A page break repeats the same "Tax Invoice N" header; only a changed N starts a new order. */
const INVOICE_HEADER = /^Tax Invoice\s+(\d+)$/i;

/**
 * Splits one paste covering several orders — a batch of invoice emails pasted together, say —
 * into one `ImportedOrder` per invoice, each read with its own date.
 *
 * A single-order paste with no "Tax Invoice" header at all still works: it comes back as one
 * order, parsed exactly as `parseNewWorldOrderText` would on its own.
 */
export function parseNewWorldOrderBatch(text: string): ImportedOrder[] {
  const lines = text.split(/\r?\n/);
  const boundaries: number[] = [];
  let currentInvoice: string | undefined;

  lines.forEach((line, index) => {
    const match = INVOICE_HEADER.exec(line.trim());
    if (match && match[1] !== currentInvoice) {
      boundaries.push(index);
      currentInvoice = match[1];
    }
  });

  if (boundaries.length === 0) return [parseNewWorldOrderText(text)];

  const segments: string[] = boundaries.map((start, i) => {
    const from = i === 0 ? 0 : start; // anything before the first header stays with the first order
    const to = i + 1 < boundaries.length ? boundaries[i + 1]! : lines.length;
    return lines.slice(from, to).join('\n');
  });

  return segments.map(parseNewWorldOrderText).filter((order) => order.lines.length > 0);
}
