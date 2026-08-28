/**
 * "Ask AshHome" — the browser side of the assistant (AshHome Phase 9, slice 9a).
 *
 * This posts to `/api/ai/ask`, which owns the system prompt and the tool loop. Slice 8b kept
 * the prompt here, on the client; slice 9a moved it to `src/ai/assistant.ts` because it now
 * has to describe tools that only exist server-side, and a prompt that names tools has to
 * live where the tools do or the two drift apart.
 *
 * What is left here is the browser's job: making the request, and turning a failure into a
 * sentence worth reading from across a kitchen.
 */

/** What the card shows a family member. Never a status code or a hostname. */
export interface AskFailure {
  message: string;
  /** True when trying the same question again is worth a shot. */
  retryable: boolean;
}

/**
 * Turns a failed response into something worth reading on a kitchen wall.
 *
 * The route's `kind` is the useful signal — `unreachable` means the home PC is off or Ollama
 * is not running, which is a thing a person can actually fix, and is worth saying out loud
 * rather than hiding behind "something went wrong".
 */
export function describeAskFailure(status: number, kind?: string): AskFailure {
  if (status === 400) {
    return { message: 'That question was too long. Try a shorter one.', retryable: false };
  }

  // 500 is the repository failing rather than the model: the database is unreachable, or the
  // server is misconfigured. Retrying the same question will not fix either.
  if (status === 500) {
    return { message: 'AshHome could not reach the household data.', retryable: false };
  }

  switch (kind) {
    case 'unreachable':
      return {
        message: 'The assistant is offline. It runs on the home PC — check that is on.',
        retryable: true,
      };
    case 'modelMissing':
    case 'config':
      return { message: 'The assistant is not set up yet.', retryable: false };
    case 'timeout':
      return { message: 'That took too long to answer. Try a shorter question.', retryable: true };
    default:
      return { message: 'The assistant could not answer that. Try again.', retryable: true };
  }
}

export interface AskAnswer {
  reply: string;
  /** Which tools the assistant used, so the card can show where the answer came from. */
  toolsUsed: string[];
  model: string;
  durationMs: number;
}

/**
 * Asks one question. Each call is independent — no conversation history is kept, here or
 * anywhere else. The application owns permanent state; a chat log on a shared wall tablet
 * is not state anybody asked for.
 *
 * Throws an `AskFailure`-shaped error object rather than an `Error`, so the caller renders a
 * sentence instead of parsing one.
 */
export async function askAshHome(question: string, signal?: AbortSignal): Promise<AskAnswer> {
  let response: Response;
  try {
    response = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal,
      body: JSON.stringify({ question }),
    });
  } catch (error) {
    // An aborted request is the card being unmounted or the question being replaced. It is
    // not a failure and must not be rendered as one.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw {
      message: 'Could not reach AshHome. Check the tablet’s connection.',
      retryable: true,
    } satisfies AskFailure;
  }

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    throw describeAskFailure(
      response.status,
      typeof body?.kind === 'string' ? body.kind : undefined,
    );
  }

  if (typeof body?.reply !== 'string' || body.reply.trim() === '') {
    throw {
      message: 'The assistant answered with nothing. Try again.',
      retryable: true,
    } satisfies AskFailure;
  }

  return {
    reply: body.reply.trim(),
    toolsUsed: Array.isArray(body.toolsUsed) ? (body.toolsUsed as string[]) : [],
    model: typeof body.model === 'string' ? body.model : 'unknown',
    durationMs: typeof body.durationMs === 'number' ? body.durationMs : 0,
  };
}

/** Tool names are internal; the card shows the family what was actually consulted. */
const TOOL_LABELS: Record<string, string> = {
  getShoppingList: 'shopping list',
  getPantry: 'pantry',
  getMealPlan: 'meal plan',
};

export function describeToolsUsed(toolsUsed: string[]): string | undefined {
  const labels = [...new Set(toolsUsed)].map((name) => TOOL_LABELS[name] ?? name);
  if (labels.length === 0) return undefined;
  if (labels.length === 1) return `Checked your ${labels[0]}`;
  return `Checked your ${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}
