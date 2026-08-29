import { afterEach, describe, expect, it, vi } from 'vitest';
import { askAshHome, confirmProposal, describeAskFailure, describeToolsUsed } from './askAshHome';

/**
 * What matters here is what a family member ends up reading. Every failure the route can
 * produce has to arrive as a sentence somebody can act on, and no status code, hostname or
 * stack trace may reach the wall.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const mockFetch = (impl: () => Promise<Response>) => {
  const spy = vi.fn(impl);
  vi.stubGlobal('fetch', spy);
  return spy;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('askAshHome', () => {
  it('posts the question to the assistant route and returns the trimmed reply', async () => {
    const fetchSpy = mockFetch(async () =>
      json({
        reply: '  Sausage pasta.  ',
        toolsUsed: ['getMealPlan'],
        model: 'qwen3:8b',
        durationMs: 1200,
      }),
    );

    const answer = await askAshHome('What should we eat?');

    expect(answer).toEqual({
      reply: 'Sausage pasta.',
      toolsUsed: ['getMealPlan'],
      model: 'qwen3:8b',
      durationMs: 1200,
    });

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    // The assistant route, not the raw transport: the prompt and the tools live server-side.
    expect(url).toBe('/api/ai/ask');
    expect(JSON.parse(String(init.body))).toEqual({ question: 'What should we eat?' });
  });

  it('sends no conversation history — each question stands alone', async () => {
    const fetchSpy = mockFetch(async () => json({ reply: 'Yes.' }));

    await askAshHome('First question');
    await askAshHome('Second question');

    const second = String((fetchSpy.mock.calls[1] as unknown as [string, RequestInit])[1].body);
    expect(second).not.toContain('First question');
  });

  it('copes with a response that carries no tools', async () => {
    mockFetch(async () => json({ reply: 'Roast it 90 minutes.' }));

    const answer = await askAshHome('How long for a chicken?');

    expect(answer.toolsUsed).toEqual([]);
  });

  it('keeps every valid action in a multi-item proposal', async () => {
    mockFetch(async () =>
      json({
        reply: 'Please confirm.',
        proposal: {
          actions: [
            { tool: 'addShoppingItem', description: 'Add Milk to the shopping list', args: { name: 'Milk' } },
            { tool: 'addShoppingItem', description: 'Add Eggs to the shopping list', args: { name: 'Eggs' } },
          ],
        },
      }),
    );

    const answer = await askAshHome('Add milk and eggs');

    expect(answer.proposal?.actions).toHaveLength(2);
    expect(answer.proposal?.actions.map((action) => action.description)).toEqual([
      'Add Milk to the shopping list',
      'Add Eggs to the shopping list',
    ]);
  });

  it('drops the whole proposal if one action is malformed instead of showing a partial list', async () => {
    mockFetch(async () =>
      json({
        reply: 'Please confirm.',
        proposal: {
          actions: [
            { tool: 'addShoppingItem', description: 'Add Milk to the shopping list', args: { name: 'Milk' } },
            { tool: 'addShoppingItem', description: '', args: { name: 'Eggs' } },
          ],
        },
      }),
    );

    const answer = await askAshHome('Add milk and eggs');

    expect(answer.proposal).toBeUndefined();
  });

  it('sends every confirmed action back without trusting display descriptions', async () => {
    const fetchSpy = mockFetch(async () => json({ result: 'Added both.' }));

    const result = await confirmProposal({
      actions: [
        { tool: 'addShoppingItem', description: 'Add Milk', args: { name: 'Milk' } },
        { tool: 'addShoppingItem', description: 'Add Eggs', args: { name: 'Eggs' } },
      ],
    });

    expect(result).toBe('Added both.');
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      actions: [
        { tool: 'addShoppingItem', args: { name: 'Milk' } },
        { tool: 'addShoppingItem', args: { name: 'Eggs' } },
      ],
    });
  });

  it('reports an offline home PC as something a person can act on', async () => {
    mockFetch(async () => json({ error: 'The assistant is not available right now.', kind: 'unreachable' }, 503));

    const failure = await askAshHome('hello').catch((caught: unknown) => caught);

    expect(failure).toMatchObject({ retryable: true });
    expect((failure as { message: string }).message).toMatch(/home PC/);
  });

  it('never leaks a status code or an address into what the wall shows', async () => {
    mockFetch(async () => json({ error: 'Request failed' }, 500));

    const failure = (await askAshHome('hello').catch((caught: unknown) => caught)) as {
      message: string;
    };

    expect(failure.message).not.toMatch(/500|127\.0\.0\.1|localhost|ollama/i);
  });

  it('treats an empty answer as a failure rather than showing a blank card', async () => {
    mockFetch(async () => json({ reply: '   ' }));

    const failure = await askAshHome('hello').catch((caught: unknown) => caught);

    expect(failure).toMatchObject({ retryable: true });
  });

  it('passes an abort straight through, so a cancelled question is not an error', async () => {
    mockFetch(async () => {
      throw new DOMException('aborted', 'AbortError');
    });

    const failure = await askAshHome('hello').catch((caught: unknown) => caught);

    expect(failure).toBeInstanceOf(DOMException);
    expect((failure as DOMException).name).toBe('AbortError');
  });

  it('reports a dropped connection as the tablet, not the assistant', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch');
    });

    const failure = (await askAshHome('hello').catch((caught: unknown) => caught)) as {
      message: string;
    };

    expect(failure.message).toMatch(/connection/i);
  });
});

describe('describeAskFailure', () => {
  it('does not offer a retry for problems retrying cannot fix', () => {
    expect(describeAskFailure(400)).toMatchObject({ retryable: false });
    // 500 is the database, not the model. Asking again will not reach it either.
    expect(describeAskFailure(500)).toMatchObject({ retryable: false });
    expect(describeAskFailure(503, 'config')).toMatchObject({ retryable: false });
    expect(describeAskFailure(503, 'modelMissing')).toMatchObject({ retryable: false });
  });

  it('offers a retry for the transient ones', () => {
    expect(describeAskFailure(504, 'timeout')).toMatchObject({ retryable: true });
    expect(describeAskFailure(502, 'upstream')).toMatchObject({ retryable: true });
    expect(describeAskFailure(503, 'unreachable')).toMatchObject({ retryable: true });
  });

  it('falls back to a readable sentence for a kind it has never seen', () => {
    const failure = describeAskFailure(502, 'something-new');
    expect(failure.message).toMatch(/could not answer/i);
    expect(failure.retryable).toBe(true);
  });
});

describe('describeToolsUsed', () => {
  it('names the data in words a family uses, not the tool names', () => {
    expect(describeToolsUsed(['getPantry'])).toBe('Checked your pantry');
    expect(describeToolsUsed(['getShoppingList', 'getMealPlan'])).toBe(
      'Checked your shopping list and meal plan',
    );
  });

  it('does not repeat a tool the assistant called twice', () => {
    expect(describeToolsUsed(['getPantry', 'getPantry'])).toBe('Checked your pantry');
  });

  it('says nothing when the answer came from the model alone', () => {
    expect(describeToolsUsed([])).toBeUndefined();
  });
});
