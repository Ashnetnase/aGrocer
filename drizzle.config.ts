import fs from 'node:fs';
import { defineConfig } from 'drizzle-kit';

/**
 * Migrations are generated locally and applied to Supabase (ADR-013).
 *
 * `DATABASE_URL` is only needed for `db:migrate` / `db:push`; `db:generate` works
 * offline from `src/db/schema.ts` alone, so no cloud project is required to
 * develop the schema.
 *
 * Next.js loads `.env.local` for the app, but drizzle-kit runs outside it, so the
 * file is read here directly rather than adding a dotenv dependency for one value.
 */
function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const file = fs.readFileSync('.env.local', 'utf8');
    return file.match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m)?.[1] ?? '';
  } catch {
    return '';
  }
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl(),
  },
  strict: true,
  verbose: true,
});
