'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabasePublishableKey, supabaseUrl } from './config';

/**
 * The Supabase client for client components (ADR-017).
 *
 * Only the sign-in screen and the sign-out button use it. Everything else still goes through
 * the route handlers — the browser never queries the database directly, which is why the
 * publishable key being public costs nothing (ADR-016).
 *
 * Cached per tab: `createBrowserClient` sets up auth state listeners, and a fresh one per
 * render would stack them up on a wall tablet that stays open for weeks.
 */
let client: SupabaseClient | undefined;

export function supabaseBrowser(): SupabaseClient {
  client ??= createBrowserClient(supabaseUrl(), supabasePublishableKey());
  return client;
}
