import { z } from 'zod';
import { categorySchema } from '@/domain/schemas/common';
import type { AgrocerRepositories } from '@/data/repositories/types';
import type { AiToolSpec } from '../types';

/**
 * Write tools (AshHome Phase 9, slice 9b).
 *
 * **A separate module and a separate record from `READ_ONLY_TOOLS`, on purpose.** ADR-015 made
 * the read/write split structural rather than a convention, so this file is a sibling, never a
 * member. Anything that can change household data belongs here, where the confirmation gate
 * applies to all of it by construction.
 *
 * The gate is the important part. A write tool is never executed by the assistant loop: the
 * model *proposes*, `src/ai/assistant.ts` returns the proposal instead of acting on it, and a
 * person confirms in the UI before `/api/ai/confirm` runs it. `CLAUDE.md` requires confirmation
 * for sensitive actions; on a shared kitchen wall, where anyone passing can talk to the tablet,
 * "the model decided to change something" is not a thing that should happen silently.
 *
 * These are also the first tools with arguments, so unlike the read tools they carry a Zod
 * schema. The model's arguments are untrusted input — it is a language model, not a caller —
 * and they are validated here before anything reaches a repository.
 */

export interface AiWriteTool<TArgs = unknown> {
  spec: AiToolSpec;
  /** Validates the model's arguments. Anything that fails is refused, not coerced. */
  schema: z.ZodType<TArgs>;
  /** The sentence a person reads before confirming. Must name every effect. */
  describe(args: TArgs): string;
  execute(args: TArgs, repos: AgrocerRepositories): Promise<string>;
  /** Executes several confirmed calls as one repository operation where the tool supports it. */
  executeMany?(args: TArgs[], repos: AgrocerRepositories): Promise<string>;
}

const addShoppingItemArgs = z.object({
  name: z.string().trim().min(1).max(80),
  /** Absent means one, which is what "add milk" means. */
  quantity: z.number().int().min(1).max(99).optional(),
  /**
   * Optional because a model that guesses a category is more annoying than one that leaves it
   * alone: a wrong aisle sends somebody to the wrong end of the shop. Defaults to Pantry, the
   * same default the app's own quick-add uses.
   */
  category: categorySchema.optional(),
});

type AddShoppingItemArgs = z.infer<typeof addShoppingItemArgs>;

const addShoppingItem: AiWriteTool<AddShoppingItemArgs> = {
  spec: {
    name: 'addShoppingItem',
    description:
      'Propose adding one item to the household shopping list. Use this when asked to add ' +
      'something to the list. The family confirms before anything is added, so propose the ' +
      'item and say you have asked them to confirm.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The item, e.g. "Milk". One item per call.' },
        quantity: {
          type: 'integer',
          description:
            'Shopping-list quantity explicitly requested by the user. Omit for one. Do not infer pack contents: "eggs" means one item, not 12 eggs.',
        },
      },
      required: ['name'],
    },
  },
  schema: addShoppingItemArgs,
  describe(args) {
    const quantity = args.quantity && args.quantity > 1 ? ` ×${args.quantity}` : '';
    const category = args.category ? ` (${args.category})` : '';
    return `Add ${args.name}${quantity}${category} to the shopping list`;
  },
  async execute(args, repos) {
    const item = await repos.shopping.add({
      name: args.name,
      category: args.category ?? 'Pantry',
      quantity: args.quantity ?? 1,
      unit: 'each',
      // The assistant has no idea what anything costs. Zero is honest; a guessed price would
      // quietly corrupt the list's estimated total, which the family actually reads.
      price: 0,
      priority: false,
    });
    // `add` merges by name, so the quantity returned may exceed the quantity asked for.
    return `Added ${item.name} (now ×${item.quantity}) to the shopping list.`;
  },
  async executeMany(argsList, repos) {
    const items = await repos.shopping.addMany(
      argsList.map((args) => ({
        name: args.name,
        category: args.category ?? 'Pantry',
        quantity: args.quantity ?? 1,
        unit: 'each',
        price: 0,
        priority: false,
      })),
    );
    const names = items.map((item) => `${item.name} (now ×${item.quantity})`);
    const summary =
      names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    return `Added ${summary} to the shopping list.`;
  },
};

/**
 * The write allow-list. Adding a tool here lets the model *propose* that action — never
 * perform it. If a tool should ever bypass confirmation, that is a decision to record as an
 * ADR, not a flag to add quietly.
 */
export const WRITE_TOOLS: Record<string, AiWriteTool> = {
  addShoppingItem: addShoppingItem as AiWriteTool,
};
