import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Session refresh and route gating (AshHome Stage 2, ADR-017).
 *
 * Two jobs, and the first is the one that is easy to forget: Supabase access tokens are
 * short-lived, so something has to rotate them. A wall tablet left open for weeks never
 * navigates, so without this it would silently fall out of its session. The middleware runs on
 * every request and writes the refreshed cookies back.
 *
 * The second job is sending signed-out visitors to `/sign-in`. That is a redirect for
 * convenience, **not** the security boundary — the boundary is `currentHouseholdId()`, which
 * every route handler goes through, because middleware is easy to bypass with a direct API
 * call and route handlers are not.
 *
 * This file must stay in the project root: Next.js only looks for it there.
 */

/** Reachable signed out. Everything else redirects. */
const PUBLIC_PATHS = ['/sign-in', '/auth', '/offline'];

/**
 * API routes answer with a status code, never a redirect. A `fetch` that follows a redirect to
 * an HTML sign-in page and tries to parse it as JSON produces a baffling error; a clean 401
 * tells the client exactly what happened.
 */
const isApiPath = (pathname: string) => pathname.startsWith('/api/');

export async function middleware(request: NextRequest) {
  // Auth off is the documented local escape hatch (see src/auth/config.ts). Checked here
  // rather than imported, because middleware runs on the edge runtime.
  if (process.env.AGROCER_AUTH === 'off') return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not remove: calling getUser() is what performs the refresh. It also validates the token
  // with Supabase, unlike getSession(), which trusts whatever the cookie says.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!user && !isPublic && !isApiPath(pathname)) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = '/sign-in';
    // So the tablet returns to the dashboard rather than the phone home screen.
    signIn.searchParams.set('next', pathname);
    return NextResponse.redirect(signIn);
  }

  if (user && pathname === '/sign-in') {
    const home = request.nextUrl.clone();
    home.pathname = request.nextUrl.searchParams.get('next') ?? '/';
    home.search = '';
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  /**
   * Everything except static assets and the files the PWA serves from the origin root.
   * `sw.js` and `manifest.webmanifest` in particular must stay reachable signed out, or the
   * service worker cannot register and the install prompt disappears (ADR-011).
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|meals/|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)',
  ],
};
