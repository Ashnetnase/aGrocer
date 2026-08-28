/**
 * "Ask AshHome" — the browser side of the AI service (AshHome Phase 8, slice 8b).
 *
 * `/api/ai/chat` is deliberately a transport: it injects no system prompt, so the framing
 * lives here, with the feature that owns the conversation.
 *
 * The honest constraint of this slice: the model has **no tools**, so it cannot see the
 * family's shopping list, pantry, meal plan or calendar. The prompt says so, and the card
 * says so, because an assistant on a kitchen wall that confidently invents what is in the
 * freezer is worse than one that admits it cannot look.
 */

/**
 * Short, plain, and explicit about what it cannot see.
 *
 * Not a secret — it ships in the client bundle, and the route accepts arbitrary messages
 * anyway. It is framing, not a security boundary; the security boundary is that there are
 * no tools.
 */
export const ASK_SYSTEM_PROMPT = [
  'You are AshHome, a helpful assistant on a New Zealand family’s kitchen wall tablet.',
  'You are shown on a screen read from across the room, so answer in at most 60 words,',
  'in plain sentences. No markdown, no headings, no bullet points, no emoji.',
  '',
  'You currently have NO access to this family’s data. You cannot see their shopping list,',
  'pantry, freezer, meal plan, calendar, chores or reminders. If you are asked about any of',
  'those, say plainly that you cannot see them yet and suggest they open the Agrocer app.',
  'Never guess, and never invent an item, a date or an event. You also cannot add, change',
  'or delete anything; say so if asked to.',
  '',
  'General cooking, food and household questions you can answer normally.',
].join('\n');

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
    response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal,
      body: JSON.stringify({
        messages: [
          { role: 'system', content: ASK_SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
      }),
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

  const body = (await response.json().catch(() => null)) as { reply?: unknown; kind?: unknown } | null;

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

  const payload = body as unknown as { reply: string; model?: string; durationMs?: number };
  return {
    reply: payload.reply.trim(),
    model: payload.model ?? 'unknown',
    durationMs: payload.durationMs ?? 0,
  };
}
