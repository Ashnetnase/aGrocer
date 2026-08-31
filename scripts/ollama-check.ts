/**
 * Connectivity check for the local Ollama server (`npm run ai:check`).
 *
 * This is a spike, not the AI architecture. It proves one thing: that Agrocer's development
 * environment can reach Ollama, send a prompt to the configured model, and read the answer
 * back. The provider abstraction, tool calling and everything else in the AI phases are
 * deliberately absent — see `CLAUDE.md`.
 *
 * Nothing in the application imports this file.
 */
import fs from 'node:fs';
import { z } from 'zod';

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'qwen3:8b';

const PROMPT =
  'Create three budget-friendly dinner ideas for a family of five using common New Zealand ' +
  'supermarket ingredients.';

/** A first token can take a while on a cold model load; the whole answer longer still. */
const TIMEOUT_MS = 180_000;

/** Same approach as `drizzle.config.ts`: read `.env.local` rather than add a dotenv dependency. */
function fromEnvFile(key: string): string | undefined {
  try {
    const file = fs.readFileSync('.env.local', 'utf8');
    return file.match(new RegExp(`^${key}\\s*=\\s*"?([^"\\n\\r]+)"?`, 'm'))?.[1];
  } catch {
    return undefined;
  }
}

function config(key: string, fallback: string): string {
  return process.env[key] ?? fromEnvFile(key) ?? fallback;
}

const tagsSchema = z.object({
  models: z.array(z.object({ name: z.string() })),
});

const chatSchema = z.object({
  model: z.string(),
  message: z.object({
    content: z.string(),
    /** qwen3 is a reasoning model; Ollama returns its scratchpad separately from the answer. */
    thinking: z.string().optional(),
  }),
  total_duration: z.number().optional(),
  eval_count: z.number().optional(),
});

async function request(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    // fetch reports every network failure as the same opaque "fetch failed", so the likely
    // causes are spelled out here rather than left for the reader to guess.
    const cause = error instanceof Error && error.cause ? ` (${String(error.cause)})` : '';
    throw new Error(
      `Could not reach Ollama at ${url}${cause}.\n` +
        '  - Is Ollama running? Check with: curl http://127.0.0.1:11434/api/version\n' +
        '  - Ollama binds to localhost only, by design. This check must run on the same machine.\n' +
        '  - Override the address with OLLAMA_BASE_URL if it listens elsewhere.',
    );
  }
}

async function main() {
  const baseUrl = config('OLLAMA_BASE_URL', DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = config('OLLAMA_MODEL', DEFAULT_MODEL);

  console.log(`Ollama:  ${baseUrl}`);
  console.log(`Model:   ${model}\n`);

  const versionResponse = await request(`${baseUrl}/api/version`);
  if (!versionResponse.ok) {
    throw new Error(`Ollama answered ${versionResponse.status} at /api/version`);
  }
  const { version } = (await versionResponse.json()) as { version?: string };
  console.log(`✓ Reachable (Ollama ${version ?? 'unknown version'})`);

  const tagsResponse = await request(`${baseUrl}/api/tags`);
  if (!tagsResponse.ok) throw new Error(`Ollama answered ${tagsResponse.status} at /api/tags`);
  const { models } = tagsSchema.parse(await tagsResponse.json());
  const installed = models.map((entry) => entry.name);

  if (!installed.includes(model)) {
    throw new Error(
      `Model "${model}" is not installed.\n` +
        `  Installed: ${installed.join(', ') || '(none)'}\n` +
        `  Pull it with: ollama pull ${model}`,
    );
  }
  console.log(`✓ Model installed (${installed.length} available: ${installed.join(', ')})\n`);

  console.log(`Prompt:  ${PROMPT}\n`);
  const startedAt = Date.now();

  const chatResponse = await request(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: PROMPT }],
      // One complete answer rather than a token stream: this check is about reachability, and
      // a streaming reader would be more moving parts to misread.
      stream: false,
      // qwen3 reasons at length by default, which triples the wait for no benefit here.
      think: false,
    }),
  });

  if (!chatResponse.ok) {
    const detail = await chatResponse.text().catch(() => '');
    throw new Error(`Ollama answered ${chatResponse.status} at /api/chat: ${detail.slice(0, 400)}`);
  }

  const result = chatSchema.parse(await chatResponse.json());
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log('─'.repeat(78));
  console.log(result.message.content.trim());
  console.log('─'.repeat(78));
  console.log(
    `\n✓ Response received in ${seconds}s` +
      (result.eval_count ? ` (${result.eval_count} tokens)` : ''),
  );
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
