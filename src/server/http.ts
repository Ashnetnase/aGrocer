import { NextResponse } from 'next/server';
import type { z } from 'zod';

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

export function failed(error: unknown) {
  // The message can carry the connection string or the household id, so it stays in the
  // server log and never reaches the browser.
  console.error('[api]', error);
  return NextResponse.json({ error: 'Request failed' }, { status: 500 });
}
