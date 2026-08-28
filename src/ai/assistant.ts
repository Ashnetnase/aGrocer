import type { AgrocerRepositories } from '@/data/repositories/types';
import { getAiProvider } from './provider';
import { READ_ONLY_TOOLS } from './tools/readOnly';
import { runTool, toolSpecs, type AiTool } from './tools/registry';
import { AiError, type AiMessage, type AiProvider } from './types';

/**
 * The AshHome assistant (Phase 9, slice 9a).
 *
 * One orchestrator with tools, not many autonomous agents — the master plan's architecture
 * principle for Stage 3. The loop is small on purpose: ask the model, run whatever tools it
 * asked for, hand back the results, ask again, and stop.
 *
 * This is server-side because the tools are. They read the household's data through
 * `serverRepositories()`, so they inherit its household scoping, and the model never sees a
 * connection string, an id or a repository — only the sentences the tools return.
 */

/**
 * The model gets at most this many chances to call tools before it must answer.
 *
 * Three is enough for the real questions ("what can I cook?" needs the pantry, sometimes the
 * plan too) and small enough that a model looping on a tool cannot spend the GPU or the
 * family's patience. Hitting the cap is not an error: the model is simply asked to answer
 * with what it has.
 */
const MAX_TOOL_ROUNDS = 3;

/**
 * Names the tools, sets the honesty rules, and says what the assistant still cannot do.
 *
 * Slice 9a changed what is true here: the model *can* now see the shopping list, pantry and
 * meal plan. What it still cannot do is change anything, or see the calendar, chores,
 * reminders or school information — none of those exist as data yet. Overstating that is the
 * failure mode this prompt exists to prevent.
 */
export const ASSISTANT_SYSTEM_PROMPT = [
  'You are AshHome, a helpful assistant on a New Zealand family’s kitchen wall tablet.',
  'You are shown on a screen read from across the room, so answer in at most 60 words,',
  'in plain sentences. No markdown, no headings, no bullet points, no emoji.',
  '',
  'You can look up three things with your tools: the shopping list, the pantry and freezer,',
  'and this week’s meal plan. Always call the tool rather than guessing, and answer only',
  'from what the tool returns. Never invent an item, a quantity, a meal or a price. If a',
  'tool says something is empty, say it is empty.',
  '',
  'You cannot change anything: you cannot add, edit or remove shopping items, pantry items',
  'or meals. If you are asked to, say plainly that you cannot yet and suggest they use the',
  'Agrocer app.',
  '',
  'You also have no access to the family calendar, chores, reminders or school information.',
  'If asked about those, say you cannot see them yet. Never guess a date or an event.',
  '',
  'General cooking, food and household questions you can answer normally, without tools.',
].join('\n');

export interface AssistantAnswer {
  reply: string;
  /** Which tools ran, in order. Surfaced so the family can see where an answer came from. */
  toolsUsed: string[];
  model: string;
  durationMs: number;
}

export interface AssistantOptions {
  /** Injected in tests. Defaults to the configured provider. */
  provider?: AiProvider;
  /** Injected in tests. Defaults to the read-only allow-list. */
  tools?: Record<string, AiTool>;
}

export async function askAssistant(
  question: string,
  repos: AgrocerRepositories,
  options: AssistantOptions = {},
): Promise<AssistantAnswer> {
  const provider = options.provider ?? getAiProvider();
  const tools = options.tools ?? READ_ONLY_TOOLS;
  const specs = toolSpecs(tools);
  const startedAt = Date.now();

  const messages: AiMessage[] = [
    { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
    { role: 'user', content: question },
  ];
  const toolsUsed: string[] = [];
  let model = provider.model;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    // On the final round the tools are withheld, which is what forces an answer: a model
    // offered tools it cannot use would otherwise keep asking for them.
    const offerTools = round < MAX_TOOL_ROUNDS;
    const result = await provider.chat({
      messages,
      ...(offerTools && specs.length > 0 ? { tools: specs } : {}),
      // Household facts, not creative writing. Low temperature so the model repeats what a
      // tool said rather than embellishing it.
      temperature: 0.2,
    });
    model = result.model;

    if (result.toolCalls.length === 0) {
      if (result.content !== '') {
        return { reply: result.content, toolsUsed, model, durationMs: Date.now() - startedAt };
      }
      // No answer and no tool call: nothing to feed back, so stop rather than loop.
      break;
    }

    // The assistant's own turn has to stay in the transcript, or the tool results that
    // follow have nothing to attach to.
    messages.push({ role: 'assistant', content: result.content });

    for (const call of result.toolCalls) {
      const run = await runTool(tools, call.name, repos);
      if (run.ok) toolsUsed.push(run.name);
      messages.push({ role: 'tool', content: run.content, toolName: run.name });
    }
  }

  throw new AiError(
    'upstream',
    `The assistant made no answer after ${MAX_TOOL_ROUNDS} tool rounds (tools used: ${
      toolsUsed.join(', ') || 'none'
    })`,
    'The assistant could not finish that. Try asking it more simply.',
  );
}
