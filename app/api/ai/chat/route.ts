import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAiProvider } from '@/ai/provider';
import { AiError, type AiErrorKind } from '@/ai/types';
import { failed, parseJson } from '@/server/http';

/**
 * The AI service edge (AshHome Phase 8).
 *
 * `GET` reports whether the provider is reachable and its model ready. `POST` sends a
 * conversation and returns one whole answer.
 *
 * What this route deliberately does not do, and must not grow by accident:
 *   - it has no tools, so the model cannot read or write a single row of household data.
 *     That is Phase 9, and it arrives as an explicit allow-list of application functions.
 *   - it injects no system prompt. Whoever calls it owns the framing, which keeps this
 *     layer honestly a transport and leaves the assistant's personality to the feature.
 *   - it persists nothing. The application owns permanent state; the model does not.
 *
 * The provider address is a private network detail, so failures return a generic message
 * and log the specifics server-side, exactly as the data routes do.
 */

export const dynamic = 'force-dynamic';

/** A household question, not a document. Bounded so one request cannot pin the GPU. */
const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().trim().min(1).max(4_000),
});

const postBodySchema = z.union([
  z.object({ prompt: z.string().trim().min(1).max(4_000) }),
  z.object({ messages: z.array(messageSchema).min(1).max(20) }),
]);

const statusByKind: Record<AiErrorKind, number> = {
  unreachable: 503,
  modelMissing: 503,
  config: 503,
  timeout: 504,
  upstream: 502,
};

function aiFailure(error: unknown) {
  if (!(error instanceof AiError)) return failed(error);
  console.error('[api/ai]', error.kind, error.message);
  return NextResponse.json(
    { error: error.publicMessage, kind: error.kind },
    { status: statusByKind[error.kind] },
  );
}

export async function GET() {
  try {
    const provider = getAiProvider();
    const health = await provider.health();
    return NextResponse.json({
      provider: provider.name,
      model: provider.model,
      ...health,
    });
  } catch (error) {
    return aiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, postBodySchema);
    if (!body.ok) return body.response;

    const provider = getAiProvider();
    const messages =
      'prompt' in body.data
        ? [{ role: 'user' as const, content: body.data.prompt }]
        : body.data.messages;

    const result = await provider.chat({ messages });

    return NextResponse.json({
      reply: result.content,
      provider: provider.name,
      model: result.model,
      tokens: result.tokens,
      durationMs: result.durationMs,
    });
  } catch (error) {
    return aiFailure(error);
  }
}
