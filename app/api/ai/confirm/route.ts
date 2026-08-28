import { NextResponse } from 'next/server';
import { z } from 'zod';
import { WRITE_TOOLS } from '@/ai/tools/write';
import { serverRepositories } from '@/server/repositories';
import { failed, parseJson } from '@/server/http';

/**
 * Executes a change the assistant proposed and a person confirmed (Phase 9, slice 9b).
 *
 * The whole point of splitting this from `/api/ai/ask` is that **no model is involved here**.
 * `/api/ai/ask` decides what to propose; this route takes a tool name and arguments from a
 * confirmed proposal and runs it. Nothing an LLM emits reaches a repository without a person
 * having read the description and pressed a button in between.
 *
 * Both halves of the proposal are re-checked rather than trusted:
 *
 *   - the tool name against `WRITE_TOOLS`, so a request naming a read tool, an unknown tool,
 *     or a repository method gets nothing;
 *   - the arguments against that tool's Zod schema, the same one the assistant validated
 *     against, because the round trip through the browser means these arrive as user input.
 *
 * That round trip grants no new privilege — the same signed-in person can already POST to
 * `/api/shopping` — so the gate is about intent, not authority. It is still validated, because
 * a handler that trusts its input is a handler that will be wrong eventually.
 */

export const dynamic = 'force-dynamic';

const postBodySchema = z.object({
  tool: z.string().min(1).max(64),
  args: z.unknown(),
});

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, postBodySchema);
    if (!body.ok) return body.response;

    const tool = WRITE_TOOLS[body.data.tool];
    if (!tool) {
      // Either a stale client after a tool was removed, or someone probing. Logged, refused,
      // and told nothing about which tools do exist.
      console.warn('[api/ai/confirm] refused unknown write tool', body.data.tool);
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const args = tool.schema.safeParse(body.data.args);
    if (!args.success) {
      return NextResponse.json(
        { error: 'Invalid action', issues: args.error.flatten() },
        { status: 400 },
      );
    }

    const result = await tool.execute(args.data, await serverRepositories());

    return NextResponse.json({ result, tool: body.data.tool });
  } catch (error) {
    return failed(error);
  }
}
