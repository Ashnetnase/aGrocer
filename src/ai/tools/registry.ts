import type { z } from 'zod';
import type { AgrocerRepositories } from '@/data/repositories/types';
import type { AiToolSpec } from '../types';

/**
 * The AI tool allow-list (AshHome Phase 9, slice 9a).
 *
 * `CLAUDE.md` is explicit: the LLM never gets unrestricted access. It acts only through
 * explicitly defined application functions. This module is where that rule is enforced —
 * a model asking for a tool is a *request*, and `runTool` is the only thing that grants it.
 *
 * Three properties hold this together, and none of them should be relaxed casually:
 *
 *   1. **Lookup is by exact name against a fixed record.** A name the registry does not
 *      contain is refused. There is no dynamic dispatch, no string-to-function mapping over
 *      the repositories, and nothing the model emits can name a method that is not listed.
 *   2. **Every 9a tool takes no arguments.** So no argument can widen what a tool reads, and
 *      there is nothing to validate beyond the name. When a tool eventually needs arguments,
 *      it validates them with a Zod schema here before the implementation sees them.
 *   3. **Read-only, by construction.** Each tool receives the repositories and calls only
 *      `list()` / `getPlan()` on them. A tool that writes belongs to slice 9b, arrives with
 *      a confirmation gate, and should not be added to `READ_ONLY_TOOLS`.
 *
 * The repositories come from `serverRepositories()`, so every tool is already scoped to the
 * household — a tool cannot read another family's data any more than a route handler can.
 */

export interface AiTool<TArgs = unknown> {
  spec: AiToolSpec;
  /**
   * Present only for tools that take arguments, and validated before `execute` sees them.
   *
   * Most read tools take none, which is the safest shape: nothing the model emits can widen
   * what they read. `searchRecipes` is the first exception — a search without a query is not
   * a search — and it is exactly the case ADR-015 anticipated: arguments arrive validated
   * here, or the call is refused.
   */
  schema?: z.ZodType<TArgs>;
  /** Returns what the model should see. Compact: it is spent as context on every turn. */
  execute(repos: AgrocerRepositories, args: TArgs): Promise<string>;
}

/** No arguments. Repeated for each tool so the shape is obvious at the call site. */
export const NO_ARGUMENTS = { type: 'object', properties: {} } as const;

export interface ToolRun {
  name: string;
  /** What the model is shown — the result, or the refusal. */
  content: string;
  ok: boolean;
}

/**
 * Runs one tool the model asked for, or refuses.
 *
 * A refusal is returned to the model as an ordinary tool result rather than thrown. That is
 * deliberate: the model then explains the limit to the family in its own words, instead of
 * the whole question failing with an error card. The refusal is still logged.
 */
export async function runTool(
  tools: Record<string, AiTool>,
  name: string,
  repos: AgrocerRepositories,
  rawArgs: unknown = {},
): Promise<ToolRun> {
  const tool = tools[name];
  if (!tool) {
    // Worth logging loudly: either the model invented a tool, or a spec and the registry
    // have drifted apart.
    console.warn('[ai/tools] refused unknown tool', name);
    return {
      name,
      ok: false,
      content: `There is no tool called "${name}". Tell the family you cannot do that.`,
      };
  }

  let args: unknown = undefined;
  if (tool.schema) {
    const parsed = tool.schema.safeParse(rawArgs);
    if (!parsed.success) {
      // Told to the model rather than thrown, so it can correct itself within the round
      // budget instead of the whole question failing.
      console.warn('[ai/tools] rejected arguments for', name, parsed.error.message);
      return {
        name,
        ok: false,
        content: `Those arguments are not valid for ${name}. Check what it needs and try once more.`,
      };
    }
    args = parsed.data;
  }

  try {
    return { name, ok: true, content: await tool.execute(repos, args) };
  } catch (error) {
    // The message can carry a connection string, so it stays in the server log. The model
    // is told the tool failed and nothing about why.
    console.error('[ai/tools] tool failed', name, error);
    return {
      name,
      ok: false,
      content: `The "${name}" lookup failed. Tell the family you could not check just now.`,
    };
  }
}

export function toolSpecs(tools: Record<string, AiTool>): AiToolSpec[] {
  return Object.values(tools).map((tool) => tool.spec);
}
