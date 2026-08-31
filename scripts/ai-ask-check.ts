/**
 * End-to-end check for the tool-using assistant (`npm run ai:ask`), the same path
 * `POST /api/ai/ask` runs, but invoked in-process against the real household's Drizzle
 * repositories rather than over HTTP — `/api/ai/ask` requires a signed-in session, which a
 * script has no easy way to hold, so this calls `askAssistant()` directly instead.
 *
 * Read-only in practice: if the model proposes a write, the proposal is printed and left
 * unconfirmed, exactly as an unconfirmed proposal sits in the real UI. Nothing is ever posted to
 * `/api/ai/confirm` from here.
 *
 *   npm run ai:ask -- "What do we usually buy?"
 */
import fs from 'node:fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { households } from '@/db/schema';
import { householdSeed } from '@/data/seed/household';
import { createDrizzleRepositories } from '@/data/drizzle/drizzleRepositories';
import { askAssistant } from '@/ai/assistant';

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const file = fs.readFileSync('.env.local', 'utf8');
  const url = file.match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m)?.[1];
  if (!url) throw new Error('DATABASE_URL is not set in the environment or .env.local');
  return url;
}

async function main() {
  const question = process.argv.slice(2).join(' ').trim() || 'What do we usually buy?';
  const sql = postgres(databaseUrl(), { max: 1, prepare: false });
  const db = drizzle(sql, { schema });

  try {
    const { settings } = householdSeed;
    const [household] = await db.select().from(households).where(eq(households.name, settings.householdName));
    if (!household) throw new Error(`Household "${settings.householdName}" not found. Run npm run db:seed first.`);

    const repos = createDrizzleRepositories(db, household.id);

    console.log(`Prompt: ${question}\n`);
    const answer = await askAssistant(question, repos);

    console.log('─'.repeat(78));
    console.log(answer.reply);
    console.log('─'.repeat(78));
    console.log(`\nTools used: ${answer.toolsUsed.join(', ') || '(none)'}`);
    console.log(`Model: ${answer.model}   Duration: ${(answer.durationMs / 1000).toFixed(1)}s`);
    if (answer.proposal) {
      console.log('\nProposal (NOT confirmed, nothing written):');
      for (const action of answer.proposal.actions) console.log(`  - [${action.tool}] ${action.description}`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
