import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { z } from 'zod';
import { trolleyAddBatchSchema, trolleyAddItemSchema } from '../../src/shopping/schemas';
import { NewWorldBrowserClient } from './retailers/newworld/newworld.client';

const port = Number(process.env.NEW_WORLD_COMPANION_PORT ?? 4317);
const host = process.env.NEW_WORLD_COMPANION_HOST ?? '127.0.0.1';
const token = process.env.NEW_WORLD_COMPANION_TOKEN;
if (host !== '127.0.0.1' && host !== 'localhost' && !token) {
  throw new Error('NEW_WORLD_COMPANION_TOKEN is required when the companion listens beyond localhost.');
}
const client = new NewWorldBrowserClient();
const searchSchema = z.object({ query: z.string().trim().min(2).max(100), storeId: z.string().max(100).optional() });

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function body(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

createServer(async (request, response) => {
  try {
    if (token && request.headers.authorization !== `Bearer ${token}`) return json(response, 401, { error: 'Unauthorized' });
    const path = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).pathname;
    if (request.method === 'GET' && path === '/health') return json(response, 200, { status: 'ok', visibleBrowser: true });
    if (request.method === 'GET' && path === '/session/status') return json(response, 200, await client.sessionStatus());
    if (request.method === 'GET' && path === '/newworld/trolley/status') return json(response, 200, await client.trolleyStatus());
    if (request.method === 'POST' && path === '/newworld/search') {
      const parsed = searchSchema.safeParse(await body(request));
      return parsed.success ? json(response, 200, { products: await client.search(parsed.data.query, parsed.data.storeId) }) : json(response, 400, { error: 'Invalid request' });
    }
    if (request.method === 'POST' && path === '/newworld/trolley/add') {
      const parsed = trolleyAddItemSchema.safeParse(await body(request));
      return parsed.success ? json(response, 200, await client.add(parsed.data)) : json(response, 400, { error: 'Invalid request' });
    }
    if (request.method === 'POST' && path === '/newworld/trolley/add-batch') {
      const parsed = trolleyAddBatchSchema.safeParse(await body(request));
      if (!parsed.success) return json(response, 400, { error: 'Invalid request' });
      const results = [];
      for (const item of parsed.data.items) results.push(await client.add(item));
      return json(response, 200, { results });
    }
    return json(response, 404, { error: 'Not found' });
  } catch (error) {
    return json(response, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}).listen(port, host, () => {
  console.log(`New World companion listening on http://${host}:${port}`);
  console.log('A visible Chrome window will open when the first browser operation is requested.');
});
