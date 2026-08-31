/**
 * One-time Gmail OAuth consent for Hero email ingestion (`npm run gmail:authorize`).
 *
 * Run this once, from the machine you're sitting at, signed in as `007agentuse@gmail.com` (or
 * ready to sign in as it when the browser prompts). It opens the Google consent screen, asks
 * for read-only Gmail access only (`gmail.readonly` — this pipeline never sends, deletes, or
 * modifies anything), and prints a refresh token to add to `.env.local` and the production
 * `.env`.
 *
 * Plain `fetch` against Google's OAuth endpoints rather than a Google SDK — the whole exchange
 * is two HTTP calls, not worth a new dependency for. Mirrors `scripts/claim.ts` and `seed.ts`:
 * a deliberate one-off run, never something the app calls itself.
 *
 * Requires GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in `.env.local` (from Google Cloud Console
 * → APIs & Services → Clients → your Desktop app client).
 */
import fs from 'node:fs';
import http from 'node:http';
import { exec } from 'node:child_process';
import { URL } from 'node:url';
import { z } from 'zod';

const PORT = 53_682;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

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
  if (!value) {
    throw new Error(
      `${key} is not set in .env.local.\n` +
        '  Get it from Google Cloud Console → APIs & Services → Clients (Desktop app client).',
    );
  }
  return value;
}

function openBrowser(url: string): void {
  const command =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(command, () => {
    // Best-effort only — the URL is printed regardless, so a failed auto-open is never fatal.
  });
}

/** Waits for Google's redirect back to `REDIRECT_URI` and returns the `code` it carries. */
function waitForAuthorizationCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const url = new URL(request.url ?? '/', REDIRECT_URI);
      if (url.pathname !== '/callback') {
        response.writeHead(404).end();
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      response.writeHead(200, { 'content-type': 'text/html' });
      response.end(
        error
          ? `<p>Authorization failed: ${error}. You can close this tab.</p>`
          : '<p>Authorized. You can close this tab and go back to the terminal.</p>',
      );

      server.close();
      if (error) reject(new Error(`Google returned an error: ${error}`));
      else if (code) resolve(code);
      else reject(new Error('Google redirected with no code and no error — unexpected.'));
    });

    server.listen(PORT, '127.0.0.1');
  });
}

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  scope: z.string(),
  token_type: z.string(),
});

async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<z.infer<typeof tokenResponseSchema>> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Google's token endpoint answered ${response.status}: ${detail.slice(0, 400)}`);
  }

  return tokenResponseSchema.parse(await response.json());
}

async function main() {
  const clientId = required('GMAIL_CLIENT_ID');
  const clientSecret = required('GMAIL_CLIENT_SECRET');

  const authorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', SCOPE);
  // offline + consent together are what guarantee a refresh token comes back, even if this
  // account already granted access once before (Google otherwise silently omits it on a repeat).
  authorizeUrl.searchParams.set('access_type', 'offline');
  authorizeUrl.searchParams.set('prompt', 'consent');

  console.log('Opening your browser for Google sign-in. If it does not open, visit:\n');
  console.log(authorizeUrl.toString());
  console.log('\nSign in as 007agentuse@gmail.com and approve read-only Gmail access.\n');

  const codePromise = waitForAuthorizationCode();
  openBrowser(authorizeUrl.toString());

  const code = await codePromise;
  console.log('✓ Authorization received, exchanging for tokens…\n');

  const tokens = await exchangeCodeForTokens(code, clientId, clientSecret);
  if (!tokens.refresh_token) {
    throw new Error(
      'Google did not return a refresh token. This can happen if access was already granted ' +
        'without being revoked first — go to https://myaccount.google.com/permissions (signed ' +
        'in as 007agentuse@gmail.com), remove this app, and run this script again.',
    );
  }

  console.log('✓ Done. Add this to .env.local and the production .env:\n');
  console.log(`GMAIL_REFRESH_TOKEN="${tokens.refresh_token}"\n`);
  console.log('This does not expire on its own. Only re-run this script if it is revoked.');
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
