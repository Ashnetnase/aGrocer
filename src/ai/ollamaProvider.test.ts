import { describe, expect, it, vi } from 'vitest';
import { createOllamaProvider } from './ollamaProvider';
import { AiError } from './types';

/**
 * These tests never reach Ollama. They pin the contract the rest of AshHome relies on:
 * the answer comes back trimmed and without the reasoning scratchpad, and every way a
 * local model can fail is classified rather than thrown raw at a route handler.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const chatBody = (overrides: Record<string, unknown> = {}) => ({
  model: 'qwen3:8b',
  message: { content: 'Sausage pasta.' },
  eval_count: 42,
  ...overrides,
});

const provider = (fetchImpl: typeof fetch) =>
  createOllamaProvider({ baseUrl: 'http://127.0.0.1:11434/', model: 'qwen3:8b', fetchImpl });

const ask = { messages: [{ role: 'user' as const, content: 'What is for dinner?' }] };

describe('chat', () => {
  it('returns the answer, the model that actually replied, and the token count', async () => {
    const fetchImpl = vi.fn(async () => json(chatBody({ message: { content: '  Sausage pasta.  ' } })));
    const result = await provider(fetchImpl as unknown as typeof fetch).chat(ask);

    expect(result.content).toBe('Sausage pasta.');
    expect(result.model).toBe('qwen3:8b');
    expect(result.tokens).toBe(42);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('discards the reasoning scratchpad qwen3 returns alongside the answer', async () => {
    const fetchImpl = vi.fn(async () =>
      json(chatBody({ message: { content: 'Sausage pasta.', thinking: 'Let me consider...' } })),
    );
    const result = await provider(fetchImpl as unknown as typeof fetch).chat(ask);

    expect(result.content).toBe('Sausage pasta.');
    expect(JSON.stringify(result)).not.toContain('consider');
  });

  it('asks for a whole answer with reasoning off, and trims the trailing slash off the base url', async () => {
    const fetchImpl = vi.fn(async () => json(chatBody()));
    await provider(fetchImpl as unknown as typeof fetch).chat(ask);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:11434/api/chat');
    const sent = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(sent.stream).toBe(false);
    expect(sent.think).toBe(false);
    expect(sent.model).toBe('qwen3:8b');
  });

  it('only sends a temperature when one was asked for', async () => {
    const fetchImpl = vi.fn(async () => json(chatBody()));
    const subject = provider(fetchImpl as unknown as typeof fetch);

    await subject.chat(ask);
    expect(JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body))).not.toHaveProperty('options');

    await subject.chat({ ...ask, temperature: 0 });
    expect(
      JSON.parse(String((fetchImpl.mock.calls[1] as unknown as [string, RequestInit])[1].body)),
    ).toMatchObject({ options: { temperature: 0 } });
  });

  it('classifies a refused connection as unreachable, without leaking the address', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });

    const error = await provider(fetchImpl as unknown as typeof fetch)
      .chat(ask)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).kind).toBe('unreachable');
    expect((error as AiError).message).toContain('127.0.0.1');
    expect((error as AiError).publicMessage).not.toContain('127.0.0.1');
  });

  it('separates a timeout from an unreachable server', async () => {
    const fetchImpl = vi.fn(async () => {
      const error = new Error('The operation was aborted due to timeout');
      error.name = 'TimeoutError';
      throw error;
    });

    const error = await provider(fetchImpl as unknown as typeof fetch)
      .chat({ ...ask, timeoutMs: 1 })
      .catch((caught: unknown) => caught);

    expect((error as AiError).kind).toBe('timeout');
  });

  it('classifies a non-2xx answer as upstream and keeps the body out of the public message', async () => {
    const fetchImpl = vi.fn(async () => json({ error: 'model "gemma3" not found' }, 404));

    const error = await provider(fetchImpl as unknown as typeof fetch)
      .chat(ask)
      .catch((caught: unknown) => caught);

    expect((error as AiError).kind).toBe('upstream');
    expect((error as AiError).message).toContain('not found');
    expect((error as AiError).publicMessage).not.toContain('not found');
  });

  it('classifies an unreadable response body rather than crashing', async () => {
    const fetchImpl = vi.fn(async () => json({ message: 'a string, not an object' }));

    const error = await provider(fetchImpl as unknown as typeof fetch)
      .chat(ask)
      .catch((caught: unknown) => caught);

    expect((error as AiError).kind).toBe('upstream');
  });

  it('refuses an empty conversation before touching the network', async () => {
    const fetchImpl = vi.fn(async () => json(chatBody()));

    const error = await provider(fetchImpl as unknown as typeof fetch)
      .chat({ messages: [] })
      .catch((caught: unknown) => caught);

    expect((error as AiError).kind).toBe('config');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('health', () => {
  const healthy = (models: string[]) =>
    vi.fn(async (url: string) =>
      url.endsWith('/api/version')
        ? json({ version: '0.33.1' })
        : json({ models: models.map((name) => ({ name })) }),
    );

  it('reports ready when the configured model is installed', async () => {
    const fetchImpl = healthy(['qwen3:8b', 'qwen3:4b']);
    const health = await provider(fetchImpl as unknown as typeof fetch).health();

    expect(health).toMatchObject({ reachable: true, modelReady: true, version: '0.33.1' });
    expect(health.availableModels).toEqual(['qwen3:8b', 'qwen3:4b']);
  });

  it('reports reachable but not ready when the model is missing', async () => {
    const fetchImpl = healthy(['gemma3:12b']);
    const health = await provider(fetchImpl as unknown as typeof fetch).health();

    expect(health).toMatchObject({ reachable: true, modelReady: false });
  });

  it('reports unreachable rather than throwing when Ollama is down', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(provider(fetchImpl as unknown as typeof fetch).health()).resolves.toEqual({
      reachable: false,
      modelReady: false,
    });
  });
});
