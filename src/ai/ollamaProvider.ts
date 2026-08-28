import { z } from 'zod';
import {
  AiError,
  type AiChatRequest,
  type AiChatResult,
  type AiHealth,
  type AiProvider,
} from './types';

/**
 * Ollama implementation of `AiProvider` (AshHome Phase 8).
 *
 * Ollama binds to `127.0.0.1` deliberately and must stay that way — that is Ash's standing
 * instruction and the right default for a machine with no auth in front of it. So this
 * provider only works from the workstation running Ollama. Reaching it from the staging VM
 * is a separate decision later: a tunnel or an authenticated proxy, never `OLLAMA_HOST=0.0.0.0`.
 *
 * Everything Ollama-shaped lives in this file. Nothing outside `src/ai/` should import it
 * directly — ask `getAiProvider()` instead.
 */

/** A cold model load can take most of a minute before the first token appears. */
const DEFAULT_TIMEOUT_MS = 120_000;

const versionSchema = z.object({ version: z.string().optional() });

const tagsSchema = z.object({
  models: z.array(z.object({ name: z.string() })),
});

const chatSchema = z.object({
  model: z.string(),
  message: z.object({
    content: z.string(),
    /** qwen3 is a reasoning model; Ollama returns its scratchpad here, and we discard it. */
    thinking: z.string().optional(),
  }),
  eval_count: z.number().optional(),
});

export interface OllamaProviderOptions {
  baseUrl: string;
  model: string;
  timeoutMs?: number;
  /** Injected in tests. Defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
}

export function createOllamaProvider(options: OllamaProviderOptions): AiProvider {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const model = options.model;
  const defaultTimeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const doFetch = options.fetchImpl ?? fetch;

  async function call(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      // `fetch` reports a timeout and a refused connection through the same opaque failure,
      // so they are separated here — they mean very different things to whoever reads the log.
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      if (timedOut) {
        throw new AiError(
          'timeout',
          `Ollama did not answer ${path} within ${timeoutMs}ms`,
          'The assistant took too long to answer. Try again.',
          error,
        );
      }
      throw new AiError(
        'unreachable',
        `Could not reach Ollama at ${baseUrl}${path}. Is it running? ` +
          'It binds to localhost by design, so this must run on the same machine.',
        'The assistant is not available right now.',
        error,
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new AiError(
        'upstream',
        `Ollama answered ${response.status} at ${path}: ${detail.slice(0, 400)}`,
        'The assistant could not complete that request.',
      );
    }

    return response;
  }

  async function health(): Promise<AiHealth> {
    let version: string | undefined;
    try {
      const response = await call('/api/version', { method: 'GET' }, 5_000);
      version = versionSchema.parse(await response.json()).version;
    } catch (error) {
      if (error instanceof AiError && error.kind === 'unreachable') {
        return { reachable: false, modelReady: false };
      }
      throw error;
    }

    const tags = tagsSchema.parse(
      await (await call('/api/tags', { method: 'GET' }, 10_000)).json(),
    );
    const availableModels = tags.models.map((entry) => entry.name);

    return {
      reachable: true,
      modelReady: availableModels.includes(model),
      version,
      availableModels,
    };
  }

  async function chat(request: AiChatRequest): Promise<AiChatResult> {
    if (request.messages.length === 0) {
      throw new AiError('config', 'chat() called with no messages', 'Nothing to ask.');
    }

    const startedAt = Date.now();
    const response = await call(
      '/api/chat',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: request.messages,
          // One complete answer. Streaming is a later phase, and a partial answer on a
          // kitchen wall is worse than a slightly slower whole one.
          stream: false,
          // qwen3 reasons at length by default, which multiplies the wait for no gain on
          // the short household questions this serves.
          think: false,
          ...(request.temperature === undefined
            ? {}
            : { options: { temperature: request.temperature } }),
        }),
      },
      request.timeoutMs ?? defaultTimeoutMs,
    );

    const raw: unknown = await response.json();
    const parsed = chatSchema.safeParse(raw);
    if (!parsed.success) {
      // A model that is not installed comes back as a 404 handled above; this is the
      // shape-changed-under-us case, which is worth naming rather than crashing on.
      throw new AiError(
        'upstream',
        `Unexpected response shape from Ollama /api/chat: ${parsed.error.message}`,
        'The assistant returned something unreadable.',
      );
    }

    return {
      content: parsed.data.message.content.trim(),
      model: parsed.data.model,
      tokens: parsed.data.eval_count,
      durationMs: Date.now() - startedAt,
    };
  }

  return { name: 'ollama', model, chat, health };
}
