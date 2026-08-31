/**
 * Connectivity check for the background/summarization provider (`npm run ai:summary-check`).
 *
 * Mirrors `npm run ai:check`, but goes through `getSummaryAiProvider()` — the same seam the
 * Hero email ingestion pipeline (Phase 13) will call into — rather than raw `fetch`, and
 * against the slower 14B model that provider is configured for.
 *
 *   npm run ai:summary-check
 *   npm run ai:summary-check -- "Summarise this in one sentence: ..."
 */
import { getSummaryAiProvider, resetAiProvider } from '@/ai/provider';

const PROMPT =
  process.argv.slice(2).join(' ').trim() ||
  'Summarise this school notice in one sentence, and say whether a reply is needed: ' +
  '"Dear families, Year 5 and 6 students are invited to the school swimming carnival next ' +
  'Thursday 10 September. Please return the signed permission slip and $5 pool entry by ' +
  'Monday 7 September. Students should wear togs under their uniform and bring a towel."';

async function main() {
  resetAiProvider();
  const provider = getSummaryAiProvider();

  console.log(`Model: ${provider.model}\n`);

  const health = await provider.health();
  if (!health.reachable) throw new Error('Ollama is not reachable.');
  if (!health.modelReady) {
    throw new Error(
      `Model "${provider.model}" is not ready. Available: ${health.availableModels?.join(', ') ?? '(unknown)'}`,
    );
  }
  console.log(`✓ Reachable and model ready (Ollama ${health.version ?? 'unknown version'})\n`);

  console.log(`Prompt:  ${PROMPT}\n`);
  const result = await provider.chat({ messages: [{ role: 'user', content: PROMPT }] });

  console.log('─'.repeat(78));
  console.log(result.content);
  console.log('─'.repeat(78));
  console.log(
    `\n✓ Response received in ${(result.durationMs / 1000).toFixed(1)}s` +
      (result.tokens ? ` (${result.tokens} tokens)` : ''),
  );
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
