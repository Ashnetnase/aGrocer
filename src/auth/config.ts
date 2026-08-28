/**
 * Supabase Auth configuration (AshHome Stage 2, ADR-017).
 *
 * The publishable key is public by design — it ships in the browser bundle, and RLS is what
 * keeps it harmless (ADR-016). The secret key is server-only and must never appear here in a
 * form a client component can import.
 *
 * Both are read through `NEXT_PUBLIC_` names because the browser client genuinely needs them
 * at runtime. The server-only secret key lives in `src/auth/admin.ts`, which is never imported
 * from a client component.
 */

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not set. Copy it into .env.local — see .env.example.',
    );
  }
  return url;
}

export function supabasePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set. Copy it into .env.local — see .env.example.',
    );
  }
  return key;
}

/**
 * Whether authentication is enforced. **On unless explicitly disabled.**
 *
 * The direction matters. A security control that defaults to off is the same bug as RLS being
 * off (ADR-016): forgetting to configure it leaves everything open. So this fails closed —
 * misconfiguration locks you out, which is loud and recoverable, rather than letting the
 * household through to anyone who can reach the port.
 *
 * `AGROCER_AUTH="off"` is the deliberate escape hatch, for local work against a database
 * without signing in. It falls back to `AGROCER_HOUSEHOLD_ID` and warns on every request, so
 * it cannot be left on by accident.
 */
export function authEnabled(): boolean {
  return process.env.AGROCER_AUTH !== 'off';
}
