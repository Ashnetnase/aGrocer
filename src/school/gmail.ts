import { z } from 'zod';

/**
 * Read-only Gmail client for Hero email ingestion (Phase 13).
 *
 * `gmail.readonly` scope only — this never sends, deletes, labels, or modifies anything in the
 * inbox. Plain `fetch` against Google's REST API, matching `scripts/gmail-authorize.ts`'s
 * reasoning: the whole surface used here is three endpoints, not worth a client library.
 *
 * Server-only. `GMAIL_CLIENT_SECRET`/`GMAIL_REFRESH_TOKEN` must never reach a client component.
 */

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface GmailMessageSummary {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
}

export interface GmailMessage extends GmailMessageSummary {
  /** Plain text, decoded from whichever MIME part the message actually offers. */
  bodyText: string;
}

const tokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
});

/** A short-lived access token, minted fresh from the long-lived refresh token on every call. */
async function getAccessToken(config: GmailConfig): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gmail token refresh failed (${response.status}): ${detail.slice(0, 400)}`);
  }

  return tokenResponseSchema.parse(await response.json()).access_token;
}

async function gmailFetch(path: string, accessToken: string): Promise<unknown> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gmail API ${path} failed (${response.status}): ${detail.slice(0, 400)}`);
  }
  return response.json();
}

const listResponseSchema = z.object({
  messages: z.array(z.object({ id: z.string() })).optional().default([]),
});

interface MessagePart {
  mimeType?: string;
  body?: { data?: string };
  parts?: MessagePart[];
  headers?: { name: string; value: string }[];
}

const messagePartSchema: z.ZodType<MessagePart> = z.lazy(() =>
  z.object({
    mimeType: z.string().optional(),
    body: z.object({ data: z.string().optional() }).optional(),
    parts: z.array(messagePartSchema).optional(),
    headers: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  }),
);

const messageResponseSchema = z.object({
  id: z.string(),
  snippet: z.string().default(''),
  payload: messagePartSchema,
  internalDate: z.string().optional(),
});

function headerValue(headers: { name: string; value: string }[], name: string): string {
  return headers.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

/** Depth-first search for the first `text/plain` part; falls back to `text/html` stripped of tags. */
function extractBodyText(part: MessagePart): string {
  const stack: MessagePart[] = [part];
  let html: string | undefined;

  while (stack.length > 0) {
    const current = stack.shift();
    if (!current) continue;
    if (current.mimeType === 'text/plain' && current.body?.data) {
      return decodeBase64Url(current.body.data);
    }
    if (current.mimeType === 'text/html' && current.body?.data && !html) {
      html = decodeBase64Url(current.body.data);
    }
    if (current.parts) stack.push(...current.parts);
  }

  return html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

/**
 * Recent messages from a specific sender domain, newest first. `maxResults` is deliberately
 * small — this is a poll, not a backfill; a household forwards a handful of Hero emails a week.
 */
export async function listRecentMessagesFrom(
  config: GmailConfig,
  senderDomain: string,
  maxResults = 20,
): Promise<GmailMessageSummary[]> {
  const accessToken = await getAccessToken(config);
  const query = encodeURIComponent(`from:${senderDomain}`);
  const list = listResponseSchema.parse(
    await gmailFetch(`/messages?q=${query}&maxResults=${maxResults}`, accessToken),
  );

  const summaries: GmailMessageSummary[] = [];
  for (const { id } of list.messages) {
    const message = await getMessage(config, id, accessToken);
    summaries.push(message);
  }
  return summaries;
}

/** Fetches one message in full, including the decoded body. Reuses an access token when given one. */
export async function getMessage(
  config: GmailConfig,
  messageId: string,
  accessTokenOverride?: string,
): Promise<GmailMessage> {
  const accessToken = accessTokenOverride ?? (await getAccessToken(config));
  const raw = messageResponseSchema.parse(
    await gmailFetch(`/messages/${messageId}?format=full`, accessToken),
  );

  const headers = raw.payload.headers ?? [];
  return {
    id: raw.id,
    from: headerValue(headers, 'From'),
    subject: headerValue(headers, 'Subject'),
    date: headerValue(headers, 'Date'),
    snippet: raw.snippet,
    bodyText: extractBodyText(raw.payload),
  };
}

/** Reads the three Gmail env vars, or throws a message naming exactly which is missing. */
export function gmailConfigFromEnv(): GmailConfig {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  const missing = [
    !clientId && 'GMAIL_CLIENT_ID',
    !clientSecret && 'GMAIL_CLIENT_SECRET',
    !refreshToken && 'GMAIL_REFRESH_TOKEN',
  ].filter((value): value is string => Boolean(value));

  if (missing.length > 0) {
    throw new Error(`Missing Gmail env vars: ${missing.join(', ')}. Run npm run gmail:authorize.`);
  }

  return { clientId: clientId!, clientSecret: clientSecret!, refreshToken: refreshToken! };
}
