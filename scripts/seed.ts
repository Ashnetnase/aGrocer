/**
 * Seeds a household into Postgres from the Stage 1 demo data (`npm run db:seed`).
 *
 * This exists as a deliberate script rather than a repository method because
 * `AgrocerRepositories.reset()` is refused against a shared database — re-seeding
 * must be an explicit act, never something a screen can trigger.
 *
 * It is idempotent by household name: running it twice will not create a second
 * household or duplicate its rows.
 *
 * Products are written here because the repository contract has no create method —
 * Stage 1 only ever read a fixed catalogue.
 */
import fs from 'node:fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { households, householdMembers, meals, pantryItems, products } from '@/db/schema';
import { priceToCents } from '@/db/mappers';
import { householdSeed } from '@/data/seed/household';
import { mealsSeed } from '@/data/seed/meals';
import { pantrySeed } from '@/data/seed/pantry';
import { productsSeed } from '@/data/seed/products';

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const file = fs.readFileSync('.env.local', 'utf8');
  const url = file.match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m)?.[1];
  if (!url) throw new Error('DATABASE_URL is not set in the environment or .env.local');
  return url;
}

async function main() {
  const sql = postgres(databaseUrl(), { max: 1, prepare: false });
  const db = drizzle(sql, { schema });

  try {
    const { settings } = householdSeed;

    const [existing] = await db
      .select()
      .from(households)
      .where(eq(households.name, settings.householdName));

    if (existing) {
      console.log(`Household "${settings.householdName}" already exists: ${existing.id}`);
      console.log('Nothing to do. Delete it first if you want a clean re-seed.');
      return;
    }

    const [household] = await db
      .insert(households)
      .values({
        name: settings.householdName,
        shopLabel: settings.shopLabel,
        currency: settings.currency,
        weeklyBudgetCents:
          settings.weeklyBudget == null ? null : priceToCents(settings.weeklyBudget),
        pinDemoDate: settings.pinDemoDate,
        pinnedDate: settings.pinnedDate,
        showBreakfastAndLunch: settings.showBreakfastAndLunch,
      })
      .returning();
    if (!household) throw new Error('Insert returned no household row');

    const householdId = household.id;

    // Seed ids like 'h1' and 'pr1' are Stage 1 artefacts; Postgres generates real
    // UUIDs, so they are dropped rather than carried across.
    await db.insert(householdMembers).values(
      householdSeed.members.map(({ name, initials, role, colour }) => ({
        householdId,
        name,
        initials,
        role,
        colour,
      })),
    );

    await db.insert(products).values(
      productsSeed.map((product) => ({
        householdId,
        name: product.name,
        brand: product.brand,
        size: product.size,
        category: product.category,
        priceCents: priceToCents(product.price),
        defaultQuantity: product.defaultQuantity,
        unit: product.unit,
        favourite: product.favourite,
        timesBought: product.timesBought,
      })),
    );

    await db.insert(pantryItems).values(
      pantrySeed.map((item) => ({
        householdId,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        state: item.state,
        note: item.note ?? null,
      })),
    );

    await db.insert(meals).values(
      mealsSeed.map((meal) => ({
        householdId,
        name: meal.name,
        minutes: meal.minutes,
        serves: meal.serves,
        tags: meal.tags,
        image: meal.image ?? null,
        description: meal.description,
        ingredients: meal.ingredients,
      })),
    );

    // The weekly plan is not seeded: planSeed references Stage 1 meal ids, and the
    // real ids only exist after the insert above. An empty planner is honest.
    console.log(`Seeded household ${householdId}`);
    console.log(`  members:  ${householdSeed.members.length}`);
    console.log(`  products: ${productsSeed.length}`);
    console.log(`  pantry:   ${pantrySeed.length}`);
    console.log(`  meals:    ${mealsSeed.length}`);
    console.log('');
    console.log('Add this to .env.local:');
    console.log(`AGROCER_HOUSEHOLD_ID="${householdId}"`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
