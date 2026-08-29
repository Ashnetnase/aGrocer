import type { AgrocerRepositories } from '@/data/repositories/types';
import { getAiProvider } from './provider';
import { READ_ONLY_TOOLS } from './tools/readOnly';
import { WRITE_TOOLS, type AiWriteTool } from './tools/write';
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
  'You can look up three things: the shopping list, the pantry and freezer, and this week’s',
  'meal plan. Always call the tool rather than guessing, and answer only from what the tool',
  'returns. Never invent an item, a quantity, a meal or a price. If a tool says something is',
  'empty, say it is empty.',
  '',
  'You can propose adding items to the shopping list. You do not add them yourself — the',
  'family sees every item you propose and confirms the whole list. So say you have asked',
  'them to confirm, not that you have added anything. Make one tool call for every requested',
  'item in the same turn; all of those calls will be shown together for confirmation.',
  'Only include a quantity or category when the person explicitly said it. "Eggs" means one',
  'shopping-list item, not twelve individual eggs. Never infer pack contents or an aisle.',
  '',
  'You cannot change anything else: not the pantry, not meals, not the meal plan, and you',
  'cannot edit or remove anything. If asked, say plainly that you cannot and suggest the',
  'Agrocer app.',
  '',
  'Never substitute one action for another. Only propose adding to the shopping list when',
  'adding to the shopping list is what was asked for. If someone asks you to plan a meal,',
  'restock the pantry or remove something, the answer is that you cannot — not a shopping',
  'item they did not ask for.',
  '',
  'You also have no access to the family calendar, chores, reminders or school information.',
  'If asked about those, say you cannot see them yet. Never guess a date or an event.',
  '',
  'General cooking, food and household questions you can answer normally, without tools.',
].join('\n');

/**
 * A change the model has asked for and a person has not yet agreed to.
 *
 * Carries the arguments back to the client and then to `/api/ai/confirm`, which re-validates
 * them. Round-tripping through the browser adds no privilege — the same signed-in person can
 * already POST to `/api/shopping` directly. What it buys is that nothing changes until
 * somebody has read `description` and pressed a button.
 */
export interface AssistantProposalAction {
  tool: string;
  /** The sentence shown on the confirmation. Built server-side, never written by the model. */
  description: string;
  args: unknown;
}

export interface AssistantProposal {
  /** Every change covered by the one confirmation. None has happened yet. */
  actions: AssistantProposalAction[];
}

export interface AssistantAnswer {
  reply: string;
  /** Which tools ran, in order. Surfaced so the family can see where an answer came from. */
  toolsUsed: string[];
  /** Set when the model asked to change something. Nothing has happened yet. */
  proposal?: AssistantProposal;
  model: string;
  durationMs: number;
}

export interface AssistantOptions {
  /** Injected in tests. Defaults to the configured provider. */
  provider?: AiProvider;
  /** Injected in tests. Defaults to the read-only allow-list. */
  tools?: Record<string, AiTool>;
  /** Injected in tests. Defaults to the write allow-list. */
  writeTools?: Record<string, AiWriteTool>;
}

export async function askAssistant(
  question: string,
  repos: AgrocerRepositories,
  options: AssistantOptions = {},
): Promise<AssistantAnswer> {
  const provider = options.provider ?? getAiProvider();
  const tools = options.tools ?? READ_ONLY_TOOLS;
  const writeTools = options.writeTools ?? WRITE_TOOLS;
  // The model is offered both, and can tell them apart only by what they do. The difference
  // that matters is enforced here, not in the prompt: a read runs, a write is intercepted.
  const specs = [
    ...toolSpecs(tools),
    ...Object.values(writeTools).map((tool) => tool.spec),
  ];
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

    const proposedActions: AssistantProposalAction[] = [];
    let rejectedWrite = false;

    for (const call of result.toolCalls) {
      const writeTool = writeTools[call.name];
      if (writeTool) {
        // The gate. A write tool is never executed here. Every valid call in this turn is
        // collected into one proposal, so one confirmation covers exactly the list shown.
        const args = writeTool.schema.safeParse(call.arguments);
        if (!args.success) {
          // The model got the arguments wrong. Tell it so, and let it try again within the
          // round budget, rather than showing the family a malformed proposal.
          console.warn('[ai/tools] rejected write arguments', call.name, args.error.message);
          messages.push({
            role: 'tool',
            content: `Those arguments are not valid for ${call.name}. Check what it needs and try once more.`,
            toolName: call.name,
          });
          rejectedWrite = true;
          continue;
        }
        proposedActions.push({
          tool: call.name,
          description: writeTool.describe(args.data),
          args: args.data,
        });
        continue;
      }

      const run = await runTool(tools, call.name, repos);
      if (run.ok) toolsUsed.push(run.name);
      messages.push({ role: 'tool', content: run.content, toolName: run.name });
    }

    if (proposedActions.length > 0 && !rejectedWrite) {
      return {
        // Do not repeat the model's prose beside a confirmation. It has previously claimed a
        // different quantity from the arguments; only the fixed intro and tool descriptions
        // are safe to place next to the button that grants intent.
        reply: 'I have prepared these shopping-list changes for you to confirm.',
        toolsUsed,
        proposal: { actions: proposedActions },
        model,
        durationMs: Date.now() - startedAt,
      };
    }

    if (rejectedWrite && proposedActions.length > 0) {
      // Do not offer a partial proposal. Tell the model to reissue every item so the next
      // confirmation either represents the full request or represents nothing.
      for (const action of proposedActions) {
        messages.push({
          role: 'tool',
          content: `No proposal was created because another requested change was invalid. Call ${action.tool} again for this item.`,
          toolName: action.tool,
        });
      }
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
