/**
 * Read-only Gmail connectivity check for Hero email ingestion (`npm run gmail:check`).
 *
 * Lists recent messages from HERO_SENDER_DOMAIN and prints one in full, so the actual shape
 * of a real Hero (Linc-Ed) email is known before extraction logic is designed — guessing at
 * the format would risk exactly the "invent missing information" CLAUDE.md warns against.
 *
 * Read-only: gmail.readonly scope, no writes to Gmail or the database.
 */
import fs from 'node:fs';
import { gmailConfigFromEnv, getMessage, listRecentMessagesFrom } from '@/school/gmail';

function fromEnvFile(key: string): string | undefined {
  try {
    const file = fs.readFileSync('.env.local', 'utf8');
    return file.match(new RegExp(`^${key}\\s*=\\s*"?([^"\\n\\r]+)"?`, 'm'))?.[1];
  } catch {
    return undefined;
  }
}

function required(key: string): string {
  const value = process.env[key] ?? fromEnvFile(key);
  if (!value) throw new Error(`${key} is not set. See .env.example.`);
  return value;
}

async function main() {
  // .env.local isn't loaded automatically for a plain tsx run — mirror it into process.env so
  // src/school/gmail.ts's gmailConfigFromEnv() (which the real app will call the same way) sees it.
  for (const key of ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN']) {
    if (!process.env[key]) {
      const value = fromEnvFile(key);
      if (value) process.env[key] = value;
    }
  }

  const senderDomain = required('HERO_SENDER_DOMAIN');
  const config = gmailConfigFromEnv();

  console.log(`Looking for mail from: ${senderDomain}\n`);
  const messages = await listRecentMessagesFrom(config, senderDomain, 10);

  if (messages.length === 0) {
    console.log('No messages found from that sender in this inbox.');
    return;
  }

  console.log(`Found ${messages.length}:\n`);
  console.table(
    messages.map((message) => ({
      date: message.date,
      from: message.from,
      subject: message.subject,
    })),
  );

  const [first] = messages;
  if (!first) return;

  console.log(`\nFull body of the most recent one (id ${first.id}):\n`);
  const full = await getMessage(config, first.id);
  console.log('─'.repeat(78));
  console.log(full.bodyText || '(no plain-text or HTML body found)');
  console.log('─'.repeat(78));
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
