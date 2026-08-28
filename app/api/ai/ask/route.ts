import { NextResponse } from 'next/server';
import { z } from 'zod';
import { askAssistant } from '@/ai/assistant';
import { AiError, type AiErrorKind } from '@/ai/types';
import { serverRepositories } from '@/server/repositories';
import { failed, parseJson } from '@/server/http';

/**
 * The AshHome assistant (AshHome Phase 9, slice 9a).
 *
 * Distinct from `/api/ai/chat` on purpose. That route is a transport: no prompt, no tools,
 * no data. This one is the assistant: it owns the system prompt, runs the tool loop, and is
 * the only path by which a model reaches household data — through the read-only allow-list
 * in `src/ai/tools/`, never the repositories directly.
 *
 * Repositories come from `serverRepositories()`, so the assistant is scoped to the household
 * exactly like every other handler, and the same thing changes when Supabase Auth lands.
 */

export const dynamic = 'force-dynamic';

const postBodySchema = z.object({ question: z.string().trim().min(1).max(1_000) });

const statusByKind: Record<AiErrorKind, number> = {
  unreachable: 503,
  modelMissing: 503,
  config: 503,
  timeout: 504,
  upstream: 502,
};

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, postBodySchema);
    if (!body.ok) return body.response;

    const answer = await askAssistant(body.data.question, await serverRepositories());

    return NextResponse.json({
      reply: answer.reply,
      toolsUsed: answer.toolsUsed,
      model: answer.model,
      durationMs: answer.durationMs,
    });
  } catch (error) {
    if (error instanceof AiError) {
      console.error('[api/ai/ask]', error.kind, error.message);
      return NextResponse.json(
        { error: error.publicMessage, kind: error.kind },
        { status: statusByKind[error.kind] },
      );
    }
    // A repository failure lands here — a missing AGROCER_HOUSEHOLD_ID, or the database
    // being unreachable. Generic to the browser, detailed in the log, like every handler.
    return failed(error);
  }
}
