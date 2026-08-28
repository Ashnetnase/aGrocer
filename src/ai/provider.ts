import { createOllamaProvider } from './ollamaProvider';
import { AiError, type AiProvider } from './types';

/**
 * Server-side AI provider resolution (AshHome Phase 8).
 *
 * The single place that decides which provider AshHome talks to. `AI_PROVIDER` selects it;
 * today `ollama` is the only implementation, and a cloud fallback would be added here
 * rather than anywhere a feature can see.
 *
 * This module must never be imported from a client component. It reads server environment
 * variables, and `OLLAMA_BASE_URL` describes the inside of the home network.
 *
 * The provider is cached across hot reloads in development for the same reason the database
 * client is: a fresh module instance per reload would rebuild it on every request.
 */

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'qwen3:8b';

const globalForAi = globalThis as typeof globalThis & { __ashhomeAiProvider?: AiProvider };

export function getAiProvider(): AiProvider {
  if (globalForAi.__ashhomeAiProvider) return globalForAi.__ashhomeAiProvider;

  const name = process.env.AI_PROVIDER ?? 'ollama';
  if (name !== 'ollama') {
    throw new AiError(
      'config',
      `AI_PROVIDER="${name}" is not implemented. Only "ollama" exists in Phase 8.`,
      'The assistant is not configured.',
    );
  }

  const provider = createOllamaProvider({
    baseUrl: process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL,
    model: process.env.OLLAMA_MODEL ?? DEFAULT_MODEL,
  });

  globalForAi.__ashhomeAiProvider = provider;
  return provider;
}

/** Test seam: drops the cached provider so the next call re-reads the environment. */
export function resetAiProvider(): void {
  globalForAi.__ashhomeAiProvider = undefined;
}
