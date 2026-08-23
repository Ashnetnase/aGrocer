import { defineConfig } from 'drizzle-kit';

/**
 * Migrations are generated locally and applied to Supabase (ADR-013).
 *
 * `DATABASE_URL` is only needed for `db:migrate` / `db:push`; `db:generate` works
 * offline from `src/db/schema.ts` alone, so no cloud project is required to
 * develop the schema.
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});
