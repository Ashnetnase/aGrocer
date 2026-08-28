import { buildPlannerWeek } from '@/domain/services/dates';
import { summariseShopping } from '@/domain/services/shopping';
import { nzd } from '@/lib/format';
import { NO_ARGUMENTS, type AiTool } from './registry';

/**
 * The read-only tools (AshHome Phase 9, slice 9a).
 *
 * Each one answers a question a family actually asks at the kitchen wall, and each returns
 * compact prose rather than JSON. Prose costs fewer tokens than a dump of objects, and a
 * small local model reads it more reliably — it does not have to be told that `checked:true`
 * means somebody already put it in the trolley.
 *
 * What they deliberately leave out is as important as what they include: no ids, no prices
 * per item beyond the total, no notes. The model is answering "what is on the list", not
 * reconstructing the database, and every field handed over is a field it can garble.
 *
 * All three are read-only. A tool that writes is slice 9b and needs a confirmation gate.
 */

const shoppingList: AiTool = {
  spec: {
    name: 'getShoppingList',
    description:
      "Read the household's current shopping list: which items are still needed, which " +
      'are already in the trolley, and the estimated total. Use this whenever asked what ' +
      'is on the list, what is left to buy, or how much the shop will cost.',
    parameters: NO_ARGUMENTS,
  },
  async execute(repos) {
    const items = await repos.shopping.list();
    if (items.length === 0) return 'The shopping list is empty.';

    const summary = summariseShopping(items);
    const remaining = summary.remaining.map(describeItem);
    const checked = summary.checked.map((item) => item.name);

    return [
      remaining.length > 0
        ? `Still needed (${remaining.length}): ${remaining.join(', ')}.`
        : 'Nothing still needed — everything on the list is in the trolley.',
      checked.length > 0 ? `Already in the trolley: ${checked.join(', ')}.` : null,
      `Estimated total ${nzd(summary.total)}.`,
    ]
      .filter(Boolean)
      .join(' ');
  },
};

const pantry: AiTool = {
  spec: {
    name: 'getPantry',
    description:
      'Read what the household has in the pantry and freezer, including which items are ' +
      'running low or have run out. Use this when asked what food is in the house, what ' +
      'can be cooked with what is available, or what needs restocking.',
    parameters: NO_ARGUMENTS,
  },
  async execute(repos) {
    const items = await repos.pantry.list();
    if (items.length === 0) return 'The pantry is empty.';

    // Grouped by stock state rather than listed flat: "what can I cook" and "what do we
    // need" are the two real questions, and they want opposite ends of the same list.
    const inStock = items.filter((item) => item.state === 'good').map(describeStock);
    const low = items.filter((item) => item.state === 'low' || item.state === 'soon');
    const out = items.filter((item) => item.state === 'out');

    return [
      inStock.length > 0 ? `In stock: ${inStock.join(', ')}.` : 'Nothing is well stocked.',
      low.length > 0 ? `Running low: ${low.map(describeStock).join(', ')}.` : null,
      out.length > 0 ? `Out of: ${out.map((item) => item.name).join(', ')}.` : null,
    ]
      .filter(Boolean)
      .join(' ');
  },
};

const mealPlan: AiTool = {
  spec: {
    name: 'getMealPlan',
    description:
      "Read this week's meal plan, including what is planned for tonight. Use this when " +
      'asked what is for dinner, what is planned tomorrow, or what the week looks like.',
    parameters: NO_ARGUMENTS,
  },
  async execute(repos) {
    const [plan, meals] = await Promise.all([repos.meals.getPlan(), repos.meals.list()]);
    const byId = new Map(meals.map((meal) => [meal.id, meal]));
    // The week is derived server-side from the real date, so the model never has to be
    // told what day it is and cannot get it wrong.
    const week = buildPlannerWeek(new Date());

    const lines = week.days.flatMap((day) => {
      const slots = plan[day.key] ?? {};
      const planned = (['breakfast', 'lunch', 'dinner'] as const)
        .map((slot) => {
          const meal = slots[slot] ? byId.get(slots[slot]) : undefined;
          return meal ? `${slot} ${meal.name} (${meal.minutes} min)` : null;
        })
        .filter(Boolean);

      if (planned.length === 0) return [];
      const when = day.isToday ? `${day.label} (today)` : day.label;
      return [`${when}: ${planned.join('; ')}.`];
    });

    if (lines.length === 0) return `Nothing is planned this week. Today is ${week.todayLabel}.`;
    return `Today is ${week.todayLabel}. ${lines.join(' ')}`;
  },
};

function describeItem(item: { name: string; quantity: number; unit: string }): string {
  return item.quantity > 1 ? `${item.name} ×${item.quantity} ${item.unit}` : item.name;
}

function describeStock(item: { name: string; quantity: number; unit: string }): string {
  return `${item.name} (${item.quantity} ${item.unit})`;
}

/**
 * The allow-list. Adding a tool here grants the model access to it, so the review question
 * for any addition is "does the model need this, and is it read-only?".
 */
export const READ_ONLY_TOOLS: Record<string, AiTool> = {
  getShoppingList: shoppingList,
  getPantry: pantry,
  getMealPlan: mealPlan,
};
