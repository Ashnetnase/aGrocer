import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { AgrocerRepositories } from '@/data/repositories/types';
import { ASSISTANT_SYSTEM_PROMPT, askAssistant } from './assistant';
import type { AiTool } from './tools/registry';
import type { AiWriteTool } from './tools/write';
import { AiError, type AiChatRequest, type AiChatResult, type AiProvider } from './types';

/**
 * The loop, tested against a scripted provider. What matters: the model's tool requests are
 * satisfied through the registry rather than executed blindly, the transcript it gets back is
 * one it can answer from, and it cannot spin forever.
 */

const result = (overrides: Partial<AiChatResult> = {}): AiChatResult => ({
  content: '',
  toolCalls: [],
  model: 'qwen3:8b',
  durationMs: 1,
  ...overrides,
});

/** Replies with each scripted turn in order, recording what it was asked. */
function scriptedProvider(turns: AiChatResult[]) {
  const requests: AiChatRequest[] = [];
  /** Fails loudly if a turn never happened, rather than asserting against `undefined`. */
  const turnAt = (index: number): AiChatRequest => {
    const request = requests[index];
    if (!request) throw new Error(`The provider was never asked a turn ${index}`);
    return request;
  };
  const provider: AiProvider = {
    name: 'fake',
    model: 'qwen3:8b',
    async chat(request) {
      requests.push(request);
      const turn = turns[requests.length - 1];
      if (!turn) throw new Error(`No scripted turn ${requests.length}`);
      return turn;
    },
    async health() {
      return { reachable: true, modelReady: true };
    },
  };
  return { provider, requests, turnAt };
}

const repos = {} as AgrocerRepositories;

const fakeTool = (name: string, content: string): AiTool => ({
  spec: { name, description: `Read ${name}.`, parameters: { type: 'object', properties: {} } },
  execute: async () => content,
});

const tools = {
  getPantry: fakeTool('getPantry', 'In stock: Rice (2 kg).'),
  getShoppingList: fakeTool('getShoppingList', 'Still needed (1): Milk.'),
};

/** Records whether it ever ran, which is the property the gate exists to guarantee. */
let addRan = false;

const addThing: AiWriteTool<{ name: string }> = {
  spec: {
    name: 'addThing',
    description: 'Propose adding a thing.',
    parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  },
  schema: z.object({ name: z.string().min(1) }),
  describe: (args) => `Add ${args.name} to the list`,
  execute: async () => {
    addRan = true;
    return 'Added.';
  },
};

const writeTools = { addThing: addThing as AiWriteTool };

beforeEach(() => {
  addRan = false;
});

describe('ASSISTANT_SYSTEM_PROMPT', () => {
  it('tells the model to use the tools rather than guess', () => {
    expect(ASSISTANT_SYSTEM_PROMPT).toMatch(/call the tool rather than guessing/i);
    expect(ASSISTANT_SYSTEM_PROMPT).toMatch(/never invent/i);
  });

  it('still says what the assistant cannot do, now that it can do more', () => {
    expect(ASSISTANT_SYSTEM_PROMPT).toMatch(/cannot change anything/i);
    expect(ASSISTANT_SYSTEM_PROMPT).toMatch(/calendar, chores, reminders or school/i);
  });
});

describe('askAssistant', () => {
  it('answers directly when the model asks for no tools', async () => {
    const { provider, requests } = scriptedProvider([result({ content: 'Roast it 90 minutes.' })]);

    const answer = await askAssistant('How long for a chicken?', repos, { provider, tools });

    expect(answer.reply).toBe('Roast it 90 minutes.');
    expect(answer.toolsUsed).toEqual([]);
    expect(requests).toHaveLength(1);
  });

  it('sends the system prompt and the question, and offers the tools', async () => {
    const { provider, turnAt } = scriptedProvider([result({ content: 'Fine.' })]);

    await askAssistant('What is for dinner?', repos, { provider, tools, writeTools: {} });

    expect(turnAt(0).messages).toEqual([
      { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
      { role: 'user', content: 'What is for dinner?' },
    ]);
    expect(turnAt(0).tools?.map((spec) => spec.name)).toEqual(['getPantry', 'getShoppingList']);
  });

  it('runs a requested tool and feeds the result back for the next turn', async () => {
    const { provider, turnAt } = scriptedProvider([
      result({ toolCalls: [{ name: 'getPantry', arguments: {} }] }),
      result({ content: 'You have rice.' }),
    ]);

    const answer = await askAssistant('What do we have?', repos, { provider, tools });

    expect(answer.reply).toBe('You have rice.');
    expect(answer.toolsUsed).toEqual(['getPantry']);
    expect(turnAt(1).messages.at(-1)).toEqual({
      role: 'tool',
      content: 'In stock: Rice (2 kg).',
      toolName: 'getPantry',
    });
  });

  it('runs every tool of a multi-tool turn, in order', async () => {
    const { provider } = scriptedProvider([
      result({
        toolCalls: [
          { name: 'getPantry', arguments: {} },
          { name: 'getShoppingList', arguments: {} },
        ],
      }),
      result({ content: 'Rice in, milk needed.' }),
    ]);

    const answer = await askAssistant('Where are we at?', repos, { provider, tools });

    expect(answer.toolsUsed).toEqual(['getPantry', 'getShoppingList']);
  });

  it('does not count a refused tool as one that was used', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { provider, turnAt } = scriptedProvider([
      result({ toolCalls: [{ name: 'deleteEverything', arguments: {} }] }),
      result({ content: 'I cannot do that.' }),
    ]);

    const answer = await askAssistant('Delete the list', repos, { provider, tools });

    expect(answer.toolsUsed).toEqual([]);
    // The refusal still reaches the model, so it can explain the limit itself.
    expect(turnAt(1).messages.at(-1)?.content).toMatch(/no tool called/i);
    warn.mockRestore();
  });

  it('withholds the tools on the final round, so the model has to answer', async () => {
    const { provider, requests, turnAt } = scriptedProvider([
      result({ toolCalls: [{ name: 'getPantry', arguments: {} }] }),
      result({ toolCalls: [{ name: 'getPantry', arguments: {} }] }),
      result({ toolCalls: [{ name: 'getPantry', arguments: {} }] }),
      result({ content: 'You have rice.' }),
    ]);

    const answer = await askAssistant('What do we have?', repos, { provider, tools });

    expect(answer.reply).toBe('You have rice.');
    expect(requests).toHaveLength(4);
    expect(turnAt(3).tools).toBeUndefined();
  });

  it('fails with a readable message rather than looping forever', async () => {
    const { provider } = scriptedProvider([
      result({ toolCalls: [{ name: 'getPantry', arguments: {} }] }),
      result({ toolCalls: [{ name: 'getPantry', arguments: {} }] }),
      result({ toolCalls: [{ name: 'getPantry', arguments: {} }] }),
      result({ toolCalls: [{ name: 'getPantry', arguments: {} }] }),
    ]);

    const error = await askAssistant('What do we have?', repos, { provider, tools }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).publicMessage).not.toMatch(/getPantry|round/i);
  });

  it('stops rather than looping when the model returns neither an answer nor a tool call', async () => {
    const { provider } = scriptedProvider([result({ content: '' })]);

    const error = await askAssistant('Hello?', repos, { provider, tools }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(AiError);
  });
});

describe('the write gate', () => {
  it('offers write tools alongside read tools', async () => {
    const { provider, turnAt } = scriptedProvider([result({ content: 'Fine.' })]);

    await askAssistant('anything', repos, { provider, tools, writeTools });

    expect(turnAt(0).tools?.map((spec) => spec.name)).toEqual([
      'getPantry',
      'getShoppingList',
      'addThing',
    ]);
  });

  it('does NOT execute a write tool — it returns a proposal instead', async () => {
    const { provider } = scriptedProvider([
      result({ toolCalls: [{ name: 'addThing', arguments: { name: 'Milk' } }] }),
    ]);

    const answer = await askAssistant('add milk', repos, { provider, tools, writeTools });

    expect(addRan).toBe(false);
    expect(answer.proposal).toEqual({
      tool: 'addThing',
      description: 'Add Milk to the list',
      args: { name: 'Milk' },
    });
  });

  it('stops the loop on a proposal rather than asking the model again', async () => {
    // Only one turn is scripted: a second call would throw.
    const { provider, requests } = scriptedProvider([
      result({ toolCalls: [{ name: 'addThing', arguments: { name: 'Milk' } }] }),
    ]);

    await askAssistant('add milk', repos, { provider, tools, writeTools });

    expect(requests).toHaveLength(1);
  });

  it('describes the proposal from validated arguments, not from the model’s words', async () => {
    const { provider } = scriptedProvider([
      result({
        content: 'I have added seventeen loaves of bread.',
        toolCalls: [{ name: 'addThing', arguments: { name: 'Bread' } }],
      }),
    ]);

    const answer = await askAssistant('add bread', repos, { provider, tools, writeTools });

    // What the family confirms is the server's sentence, whatever the model claimed.
    expect(answer.proposal?.description).toBe('Add Bread to the list');
  });

  it('refuses malformed arguments and lets the model retry, without proposing anything', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { provider, turnAt } = scriptedProvider([
      result({ toolCalls: [{ name: 'addThing', arguments: { name: '' } }] }),
      result({ content: 'Sorry, what should I add?' }),
    ]);

    const answer = await askAssistant('add', repos, { provider, tools, writeTools });

    expect(answer.proposal).toBeUndefined();
    expect(addRan).toBe(false);
    expect(turnAt(1).messages.at(-1)?.content).toMatch(/not valid/i);
    warn.mockRestore();
  });

  it('falls back to its own sentence when the model says nothing', async () => {
    const { provider } = scriptedProvider([
      result({ content: '', toolCalls: [{ name: 'addThing', arguments: { name: 'Eggs' } }] }),
    ]);

    const answer = await askAssistant('add eggs', repos, { provider, tools, writeTools });

    expect(answer.reply).toBe('Add Eggs to the list?');
  });
});
