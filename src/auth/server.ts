import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabasePublishableKey, supabaseUrl } from './config';

/**
 * The Supabase client for server components, route handlers and server actions (ADR-017).
 *
 * Sessions live in cookies rather than `localStorage`, which is what lets a route handler know
 * who is asking. `@supabase/ssr` needs read and write access to those cookies so it can rotate
 * a refresh token mid-request.
 *
 * Server-only: it reads `next/headers`. Importing it from a client component fails the build,
 * which is the intended guard.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components cannot set cookies. That is fine and expected: the middleware
          // refreshes the session on every request, so a token rotation dropped here has
          // already been persisted there.
        }
      },
    },
  });
}

/**
 * The signed-in user, or `undefined`.
 *
 * Uses `getUser()`, never `getSession()`. `getSession()` returns whatever the cookie claims
 * without verifying it, so on a server it is worth nothing — anyone can write a cookie.
 * `getUser()` validates the token with Supabase before answering.
 */
export async function currentUser(): Promise<{ id: string; email?: string } | undefined> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return undefined;
  return { id: data.user.id, email: data.user.email };
}
