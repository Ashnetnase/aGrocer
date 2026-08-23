import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Server-only Drizzle client (ADR-013).
 *
 * `DATABASE_URL` points at the Supabase session pooler. This module must never be
 * imported from a client component — the connection string is a secret, and the
 * `postgres` driver is a Node dependency that cannot run in the browser.
 *
 * The client is cached across hot reloads in development, where a fresh module
 * instance per reload would otherwise leak connections until the pool is exhausted.
 */

export type Database = ReturnType<typeof createClient>;

function createClient(url: string) {
  const sql = postgres(url, {
    // The pooler already multiplexes, so each server instance needs very few.
    max: 5,
    // Supabase's transaction pooler cannot cache prepared statements.
    prepare: false,
  });
  return drizzle(sql, { schema });
}

declare global {
  // eslint-disable-next-line no-var
  var __agrocerDb: Database | undefined;
}

export function getDb(): Database {
  // In development the module cache is discarded on every hot reload, so the
  // client is parked on `globalThis` instead. In production the module-level
  // binding is enough and lives for the life of the server.
  if (globalThis.__agrocerDb) return globalThis.__agrocerDb;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local and fill it in from the Supabase dashboard.',
    );
  }

  globalThis.__agrocerDb = createClient(url);
  return globalThis.__agrocerDb;
}
