/**
 * Verifies the database's row-level security posture (`npm run db:rls`).
 *
 * Two independent things, because either alone is misleading:
 *
 *   1. **Is RLS enabled on every table?** Read from `pg_class` over the ordinary Drizzle
 *      connection.
 *   2. **Can the publishable key actually read anything?** Asked by trying it, against
 *      Supabase's REST API, the way an attacker would. A configuration that *looks* right and
 *      still serves rows to an anonymous caller is the failure this script exists to catch.
 *
 * The publishable key is designed to be public — it ships in browser bundles. It is not a
 * secret, and it is exactly why RLS matters: without it, that key is a full read/write
 * credential for the whole database.
 *
 * Exits non-zero if any table has RLS off, or if any anonymous read succeeds. Safe to run
 * against production; it only reads.
 */
import fs from 'node:fs';
import postgres from 'postgres';

const TABLES = [
  'households',
  'household_members',
  'pantry_items',
  'products',
  'shopping_items',
  'meals',
  'plan_entries',
] as const;

/** Same approach as `drizzle.config.ts`: read `.env.local` rather than add a dotenv dependency. */
function fromEnvFile(key: string): string | undefined {
  try {
    const file = fs.readFileSync('.env.local', 'utf8');
    return file.match(new RegExp(`^${key}\\s*=\\s*"?([^"\\n\\r]+)"?`, 'm'))?.[1];
  } catch {
    return undefined;
  }
}

const config = (key: string): string | undefined => process.env[key] ?? fromEnvFile(key);

interface TableState {
  table: string;
  rlsEnabled: boolean;
  policies: number;
}

async function readDatabaseState(): Promise<{ role: string; bypassesRls: boolean; tables: TableState[] }> {
  const url = config('DATABASE_URL');
  if (!url) throw new Error('DATABASE_URL is not set. Copy it into .env.local from Supabase.');

  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const [role] = await sql<{ current_user: string; rolbypassrls: boolean }[]>`
      select current_user, rolbypassrls from pg_roles where rolname = current_user`;

    const rows = await sql<{ table: string; rls: boolean; policies: number }[]>`
      select c.relname as "table",
             c.relrowsecurity as rls,
             (select count(*) from pg_policies p
               where p.schemaname = 'public' and p.tablename = c.relname)::int as policies
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by c.relname`;

    return {
      role: role?.current_user ?? 'unknown',
      bypassesRls: role?.rolbypassrls ?? false,
      tables: rows.map((row) => ({ table: row.table, rlsEnabled: row.rls, policies: row.policies })),
    };
  } finally {
    await sql.end();
  }
}

/**
 * Tries to read one row per table with the publishable key, over PostgREST.
 *
 * A `200` with rows means that table is readable by anyone who has the key — which is anyone
 * who has ever loaded the app. A `401`/`403`, or a `200` with an empty array, means RLS is
 * doing its job: with no policy granting access, there is nothing to return.
 */
async function probeAnonymousReads(
  baseUrl: string,
  key: string,
): Promise<{ table: string; status: number; rows: number | null }[]> {
  const results = [];
  for (const table of TABLES) {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/v1/${table}?select=*&limit=1`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
    });
    const body: unknown = await response.json().catch(() => null);
    results.push({
      table,
      status: response.status,
      rows: Array.isArray(body) ? body.length : null,
    });
  }
  return results;
}

async function main() {
  const state = await readDatabaseState();
  console.log(`Connection role: ${state.role} (bypasses RLS: ${state.bypassesRls})`);
  if (state.bypassesRls) {
    console.log(
      '  This is why enabling RLS does not break the app: every query the route handlers make\n' +
        '  runs as the table owner. RLS is the wall around the publishable key, not around us.',
    );
  }
  console.log();

  console.table(state.tables);
  const unprotected = state.tables.filter((table) => !table.rlsEnabled);

  const baseUrl = config('SUPABASE_URL');
  const key = config('SUPABASE_PUBLISHABLE_KEY');
  let leaked: { table: string; status: number; rows: number | null }[] = [];

  if (!baseUrl || !key) {
    console.log('SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY not set — skipping the anonymous probe.');
  } else {
    console.log('Probing each table with the publishable key, as an anonymous caller would:\n');
    const probes = await probeAnonymousReads(baseUrl, key);
    console.table(probes);
    leaked = probes.filter((probe) => probe.status === 200 && (probe.rows ?? 0) > 0);
  }

  console.log();
  if (unprotected.length === 0 && leaked.length === 0) {
    console.log('✓ RLS is enabled on every table, and the publishable key reads nothing.');
    return;
  }

  if (unprotected.length > 0) {
    console.error(`✗ RLS is DISABLED on: ${unprotected.map((t) => t.table).join(', ')}`);
  }
  if (leaked.length > 0) {
    console.error(
      `✗ The publishable key can READ: ${leaked.map((probe) => probe.table).join(', ')}\n` +
        '  That key is public by design. This is a live data exposure.',
    );
  }
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
