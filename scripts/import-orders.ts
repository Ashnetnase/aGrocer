/**
 * Bulk-imports past New World orders from a text file (`npm run orders:import -- <file>`).
 *
 * The UI path (Settings → Order history) is paste-one-sitting; this is the same parser and the
 * same "review before writing" idea, but for backfilling months of order history at once from a
 * file rather than pasting into the browser. It prints what it is about to do before writing.
 *
 * Never reads a customer name, address or phone number out of the file — same as the parser
 * (`src/domain/services/orderImport.ts`) and the UI it backs.
 */
import fs from 'node:fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { households, orderLineItems } from '@/db/schema';
import { priceToCents } from '@/db/mappers';
import { householdSeed } from '@/data/seed/household';
import { parseNewWorldOrderBatch } from '@/domain/services/orderImport';

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const file = fs.readFileSync('.env.local', 'utf8');
  const url = file.match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m)?.[1];
  if (!url) throw new Error('DATABASE_URL is not set in the environment or .env.local');
  return url;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npm run orders:import -- <path-to-order-text-file>');
    process.exitCode = 1;
    return;
  }

  const text = fs.readFileSync(filePath, 'utf8');
  const orders = parseNewWorldOrderBatch(text);
  const totalLines = orders.reduce((total, order) => total + order.lines.length, 0);

  console.log(`Read ${orders.length} order(s), ${totalLines} item(s) total.`);
  for (const order of orders) {
    console.log(`  ${order.orderedOn ?? '(no date found)'} — ${order.lines.length} items, ${order.unparsed.length} unreadable lines skipped`);
  }
  if (orders.some((order) => !order.orderedOn)) {
    console.error('At least one order has no date. Fix the source file and retry — nothing was written.');
    process.exitCode = 1;
    return;
  }
  if (!totalLines) {
    console.log('Nothing to import.');
    return;
  }

  const sql = postgres(databaseUrl(), { max: 1, prepare: false });
  const db = drizzle(sql, { schema });

  try {
    const { settings } = householdSeed;
    const [household] = await db.select().from(households).where(eq(households.name, settings.householdName));
    if (!household) throw new Error(`Household "${settings.householdName}" not found. Run npm run db:seed first.`);

    const values = orders.flatMap((order) =>
      order.lines.map((line) => ({
        householdId: household.id,
        retailer: 'new-world' as const,
        name: line.name,
        quantity: line.quantity,
        unit: line.unit,
        unitPriceCents: priceToCents(line.unitPrice),
        totalPriceCents: priceToCents(line.totalPrice),
        orderedOn: order.orderedOn!,
      })),
    );

    const rows = await db.insert(orderLineItems).values(values).returning({ id: orderLineItems.id });
    console.log(`Imported ${rows.length} order line(s) for household ${household.id}.`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
