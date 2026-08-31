import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgrocerRepositories } from '@/data/repositories/types';
import type { ShoppingItem } from '@/domain/schemas/shopping';

const { serverRepositoriesMock } = vi.hoisted(() => ({
  serverRepositoriesMock: vi.fn(),
}));

vi.mock('@/server/repositories', () => ({ serverRepositories: serverRepositoriesMock }));

import { POST } from '../../app/api/ai/confirm/route';

const item = (name: string): ShoppingItem => ({
  id: name.toLowerCase(),
  name,
  category: 'Pantry',
  quantity: 1,
  unit: 'each',
  price: 0,
  priority: false,
  checked: false,
});

function request(body: unknown) {
  return new Request('http://localhost/api/ai/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/ai/confirm', () => {
  const addMany = vi.fn(async (drafts: Array<{ name: string }>) =>
    drafts.map((draft) => item(draft.name)),
  );

  beforeEach(() => {
    addMany.mockClear();
    serverRepositoriesMock.mockReset();
    serverRepositoriesMock.mockResolvedValue({
      shopping: { addMany },
    } as unknown as AgrocerRepositories);
  });

  it('executes a confirmed shopping proposal through one batch write', async () => {
    const response = await POST(
      request({
        actions: [
          { tool: 'addShoppingItem', args: { name: 'Milk' } },
          { tool: 'addShoppingItem', args: { name: 'Eggs' } },
        ],
      }),
    );

    expect(response.status).toBe(200);
    expect(addMany).toHaveBeenCalledOnce();
    expect(addMany.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({ name: 'Milk', quantity: 1, price: 0 }),
      expect.objectContaining({ name: 'Eggs', quantity: 1, price: 0 }),
    ]);
  });

  it('refuses the complete proposal before resolving repositories when one action is invalid', async () => {
    const response = await POST(
      request({
        actions: [
          { tool: 'addShoppingItem', args: { name: 'Milk' } },
          { tool: 'addShoppingItem', args: { name: '' } },
        ],
      }),
    );

    expect(response.status).toBe(400);
    expect(serverRepositoriesMock).not.toHaveBeenCalled();
    expect(addMany).not.toHaveBeenCalled();
  });

  it('refuses an unknown action without revealing the allow-list', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const response = await POST(
      request({ actions: [{ tool: 'shopping.add', args: { name: 'Milk' } }] }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Unknown action' });
    expect(serverRepositoriesMock).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
