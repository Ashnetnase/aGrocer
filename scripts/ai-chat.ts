/**
 * End-to-end check for the AI service route (`npm run ai:chat`).
 *
 * Where `npm run ai:check` proves the workstation can reach Ollama, this proves the whole
 * Phase 8 path: `/api/ai/chat` → `getAiProvider()` → `OllamaProvider` → Ollama → back.
 *
 * The dev server must be running (`npm run dev`). Pass a question as arguments, or take
 * the default one.
 *
 *   npm run ai:chat
 *   npm run ai:chat -- "Suggest a quick weeknight dinner for five."
 */

const baseUrl = (process.env.AGROCER_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const question =
  process.argv.slice(2).join(' ').trim() ||
  'In one short paragraph, suggest a quick weeknight dinner for a family of five.';

/** The route allows a cold model load to take its time; so must the client asking. */
const TIMEOUT_MS = 180_000;

async function call(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${baseUrl}${path}`, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    const cause = error instanceof Error && error.cause ? ` (${String(error.cause)})` : '';
    throw new Error(
      `Could not reach the app at ${baseUrl}${path}${cause}.\n` +
        '  - Is the dev server running? Start it with: npm run dev\n' +
        '  - Override the address with AGROCER_BASE_URL.',
    );
  }
}

/**
 * The route always answers JSON, but a dev server with a stale `.next` answers an HTML
 * error page instead. Parsing that blindly hides the real status behind a JSON syntax error.
 */
async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Expected JSON from the app but got ${response.status}.` +
        '\n  - A dev server started straight after `npm run build` can serve a stale .next.' +
        '\n    Stop it, delete .next, and run `npm run dev` again.',
    );
  }
}

async function main() {
  console.log(`App:     ${baseUrl}\n`);

  const healthResponse = await call('/api/ai/chat');
  const health = await readJson(healthResponse);

  if (!healthResponse.ok) {
    throw new Error(
      `Health check failed (${healthResponse.status}): ${String(health.error ?? '')}\n` +
        '  The server log has the detail — the route keeps the address out of the response.',
    );
  }

  console.log(`Provider: ${String(health.provider)} ${String(health.version ?? '')}`.trimEnd());
  console.log(`Model:    ${String(health.model)}`);
  console.log(`Reachable: ${String(health.reachable)}   Model ready: ${String(health.modelReady)}`);
  if (!health.reachable) {
    throw new Error(
      'The app reached the AI route, but the route could not reach Ollama.\n' +
        '  - Is Ollama running? Check with: curl http://127.0.0.1:11434/api/version\n' +
        '  - It binds to localhost by design, so the app must run on the same machine.\n' +
        '  - The server log has the address; the route keeps it out of the response.',
    );
  }
  if (!health.modelReady) {
    throw new Error(
      `Model "${String(health.model)}" is not ready.\n` +
        `  Installed: ${(health.availableModels as string[] | undefined)?.join(', ') || '(none)'}\n` +
        `  Pull it with: ollama pull ${String(health.model)}`,
    );
  }

  console.log(`\nPrompt:  ${question}\n`);

  const chatResponse = await call('/api/ai/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: question }),
  });

  const body = await readJson(chatResponse);
  if (!chatResponse.ok) {
    throw new Error(`Chat failed (${chatResponse.status}): ${String(body.error ?? '')}`);
  }

  console.log('─'.repeat(78));
  console.log(String(body.reply));
  console.log('─'.repeat(78));
  console.log(
    `\n✓ ${String(body.model)} answered in ${((body.durationMs as number) / 1000).toFixed(1)}s` +
      (body.tokens ? ` (${String(body.tokens)} tokens)` : ''),
  );
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
