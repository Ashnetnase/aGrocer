import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { AuthError } from './repositories';

/**
 * Shared plumbing for the route handlers.
 *
 * Two rules, both about not leaking: a failure returns a generic message and logs the
 * detail server-side, and a validation failure returns the field errors but never echoes
 * the submitted body back.
 */

type Parsed<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export async function parseJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<Parsed<z.infer<T>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Body must be JSON' }, { status: 400 }),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid request', issues: result.error.flatten() },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: result.data };
}

/** A 404 for "the id was not found", which the repositories signal with `undefined`. */
export function notFound(what: string) {
  return NextResponse.json({ error: `${what} not found` }, { status: 404 });
}

/**
 * A request with no household behind it.
 *
 * `401` for "not signed in" and `403` for "signed in, but not part of a household" — the
 * difference matters to the client, which should send the first to the sign-in screen and
 * show the second as a message. Neither says which user or household, because an error is
 * not a place to confirm what exists.
 */
function refused(error: AuthError) {
  console.warn('[auth]', error.reason, error.message);
  return error.reason === 'unauthenticated'
    ? NextResponse.json({ error: 'Sign in to continue', reason: error.reason }, { status: 401 })
    : NextResponse.json(
        { error: 'This account is not part of a household', reason: error.reason },
        { status: 403 },
      );
}

export function failed(error: unknown) {
  // Auth failures reach here through the same catch as everything else, because every handler
  // resolves its repositories inside its try block. Mapping them here means no handler has to
  // remember to.
  if (error instanceof AuthError) return refused(error);

  // The message can carry the connection string or the household id, so it stays in the
  // server log and never reaches the browser.
  console.error('[api]', error);
  return NextResponse.json({ error: 'Request failed' }, { status: 500 });
}
