import { describe, expect, it } from 'vitest';
import { parseNewWorldOrderBatch, parseNewWorldOrderText } from './orderImport';

// Structurally representative of a real New World invoice — category headers, weighted and
// each-sold lines, a substitution, an out-of-stock line, boilerplate and a delivery date — but
// entirely synthetic. Never paste a real invoice into a test fixture: it carries a name, address
// and phone number this parser is specifically designed not to read.
const SAMPLE = `
Tax Invoice 100000000
Customer Order Ref
Invoice Date
26.08.2026
Description Ordered Supplied Unit Price Amount

Substituted Items
Masterfoods Smoked Paprika 35g 1 0 ea ea
(sub) Value Brand Paprika 30g 1 2.89 2.89 ea ea /

We apologise these products were regretfully out of stock
Rascals Nappy Pants Size 6 14pk 2 0 ea ea

These items have been supplied in full
Beef
Prime Beef Mince kg 0.5 0.501 22.99 11.52 kg kg kg /
Milk
Pams Standard Milk 3l 1 1 7.65 7.65 ea ea ea /

Sub Total 253.50
Total 258.50
Incl. GST of 33.72
Amount tendered (Credit Card) 258.50
GST Number 109-923-680
`;

describe('parseNewWorldOrderText', () => {
  it('reads the invoice date', () => {
    expect(parseNewWorldOrderText(SAMPLE).orderedOn).toBe('2026-08-26');
  });

  it('reads a weighted line using the supplied quantity, not the ordered quantity', () => {
    const { lines } = parseNewWorldOrderText(SAMPLE);
    const mince = lines.find((line) => line.name === 'Prime Beef Mince');
    expect(mince).toEqual({ name: 'Prime Beef Mince', quantity: 0.501, unit: 'kg', unitPrice: 22.99, totalPrice: 11.52 });
  });

  it('reads an each-sold line with the size folded into the name', () => {
    const { lines } = parseNewWorldOrderText(SAMPLE);
    const milk = lines.find((line) => line.name === 'Pams Standard Milk 3l');
    expect(milk).toEqual({ name: 'Pams Standard Milk 3l', quantity: 1, unit: 'ea', unitPrice: 7.65, totalPrice: 7.65 });
  });

  it('takes the substituted product, not the out-of-stock original', () => {
    const { lines } = parseNewWorldOrderText(SAMPLE);
    expect(lines.some((line) => line.name === 'Masterfoods Smoked Paprika 35g')).toBe(false);
    expect(lines.find((line) => line.name === 'Value Brand Paprika 30g')).toEqual({
      name: 'Value Brand Paprika 30g', quantity: 1, unit: 'ea', unitPrice: 2.89, totalPrice: 2.89,
    });
  });

  it('drops a line that was ordered but never supplied', () => {
    const { lines } = parseNewWorldOrderText(SAMPLE);
    expect(lines.some((line) => line.name.includes('Nappy Pants'))).toBe(false);
  });

  it('never extracts a customer name, address or invoice/order number', () => {
    const withPii = SAMPLE.replace(
      'Customer Order Ref',
      'Customer Order Ref\nJane Smith\n42 Example Street\nSome Town 9012\nTel: 021234567',
    );
    const { lines, unparsed } = parseNewWorldOrderText(withPii);
    const everything = [...lines.map((line) => line.name), ...unparsed].join(' ');
    expect(everything).not.toMatch(/Jane Smith|Example Street|021234567/);
  });

  it('ignores invoice totals and boilerplate rather than treating them as unparsed products', () => {
    const { unparsed } = parseNewWorldOrderText(SAMPLE);
    expect(unparsed.some((line) => /sub total|total|amount tendered|gst number/i.test(line))).toBe(false);
  });

  it('ignores the liquor licence footer, a bare fee amount, and a one-price out-of-stock echo', () => {
    const withFooterNoise = `${SAMPLE}
Store Liquor Licence Number 69/OFF/05/2024 Expiry Date 24.05.2028
1.50
Satsuma Mandarins kg 1 0 4.99 kg kg kg /`;
    const { unparsed, lines } = parseNewWorldOrderText(withFooterNoise);
    expect(unparsed).toEqual([]);
    expect(lines.some((line) => line.name.includes('Satsuma'))).toBe(false);
  });

  it('returns no lines and no date for text with nothing recognisable', () => {
    const result = parseNewWorldOrderText('Just some notes, nothing invoice-shaped here.');
    expect(result.lines).toEqual([]);
    expect(result.orderedOn).toBeUndefined();
  });
});

describe('parseNewWorldOrderBatch', () => {
  const secondOrder = `
Tax Invoice 200000001
Invoice Date
19.08.2026
Chicken & Poultry
NZ Chicken Drumsticks kg 1.2 1.22 5.99 7.31 kg kg /kg *
`;

  it('splits a repeated invoice number across pages into one order', () => {
    // SAMPLE has no "Tax Invoice" header at all, so a two-page invoice is simulated directly.
    const twoPage = `Tax Invoice 300000001\nInvoice Date\n26.08.2026\nMilk\nPams Standard Milk 3l 1 1 7.65 7.65 ea ea ea /\nTax Invoice 300000001\nBeef\nPrime Beef Mince kg 0.5 0.501 22.99 11.52 kg kg kg /`;
    const orders = parseNewWorldOrderBatch(twoPage);
    expect(orders).toHaveLength(1);
    expect(orders[0]!.lines).toHaveLength(2);
  });

  it('splits on a genuinely new invoice number, each with its own date', () => {
    const firstOrder = 'Tax Invoice 300000001\n' + SAMPLE;
    const orders = parseNewWorldOrderBatch(`${firstOrder}\n${secondOrder}`);
    expect(orders).toHaveLength(2);
    expect(orders[0]!.orderedOn).toBe('2026-08-26');
    expect(orders[1]!.orderedOn).toBe('2026-08-19');
    expect(orders[1]!.lines[0]!.name).toBe('NZ Chicken Drumsticks');
  });

  it('falls back to one order when there is no invoice header at all', () => {
    const orders = parseNewWorldOrderBatch(SAMPLE);
    expect(orders).toHaveLength(1);
    expect(orders[0]!.orderedOn).toBe('2026-08-26');
  });
});
