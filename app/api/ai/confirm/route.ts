import { NextResponse } from 'next/server';
import { z } from 'zod';
import { WRITE_TOOLS } from '@/ai/tools/write';
import { serverRepositories } from '@/server/repositories';
import { failed, parseJson } from '@/server/http';

/**
 * Executes a change the assistant proposed and a person confirmed (Phase 9, slice 9b).
 *
 * The whole point of splitting this from `/api/ai/ask` is that **no model is involved here**.
 * `/api/ai/ask` decides what to propose; this route takes the ordered action list from a
 * confirmed proposal and runs it. Nothing an LLM emits reaches a repository without a person
 * having read every description and pressed a button in between.
 *
 * Every action in the proposal is re-checked rather than trusted:
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

const actionSchema = z.object({
  tool: z.string().min(1).max(64),
  args: z.unknown(),
});

const postBodySchema = z.object({ actions: z.array(actionSchema).min(1).max(20) });

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, postBodySchema);
    if (!body.ok) return body.response;

    // Validate the complete proposal before opening the write path. One malformed or unknown
    // action refuses the whole confirmation, so "milk and eggs" can never become only milk.
    const validated = [];
    for (const action of body.data.actions) {
      const tool = WRITE_TOOLS[action.tool];
      if (!tool) {
        console.warn('[api/ai/confirm] refused unknown write tool', action.tool);
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }
      const args = tool.schema.safeParse(action.args);
      if (!args.success) {
        return NextResponse.json(
          { error: 'Invalid action', issues: args.error.flatten() },
          { status: 400 },
        );
      }
      validated.push({ name: action.tool, tool, args: args.data });
    }

    const repos = await serverRepositories();
    const first = validated[0]!;
    let result: string;
    if (
      first.tool.executeMany &&
      validated.every((action) => action.name === first.name && action.tool === first.tool)
    ) {
      result = await first.tool.executeMany(
        validated.map((action) => action.args),
        repos,
      );
    } else {
      const results = [];
      for (const action of validated) results.push(await action.tool.execute(action.args, repos));
      result = results.join(' ');
    }

    return NextResponse.json({ result, actions: validated.map((action) => action.name) });
  } catch (error) {
    return failed(error);
  }
}
