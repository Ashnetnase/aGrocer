import type { Meal, Plan } from '../schemas/meal';
import type { ShoppingItem } from '../schemas/shopping';
import { buildPlannerWeek } from './dates';
import { summariseShopping, summariseShoppingBudget } from './shopping';
import { nzd } from '@/lib/format';

/**
 * Builds the weekly meal-plan + shopping-list email (AshHome, Stage 5).
 *
 * Deliberately not AI-written. The project's rule throughout is "never invent an item, a
 * quantity, a meal or a price" — that applies at least as much to something posted to a real
 * inbox as to a wall-dashboard answer, so this assembles the email from the same real data the
 * app already shows, in code, rather than asking a model to describe the week in its own words
 * and risking a wrong quantity in someone's actual sent mail.
 */

export interface WeeklyDigest {
  subject: string;
  text: string;
}

export function buildWeeklyDigest(
  plan: Plan,
  meals: Meal[],
  shopping: ShoppingItem[],
  weeklyBudget: number | null | undefined,
  now = new Date(),
): WeeklyDigest {
  const week = buildPlannerWeek(now);
  const byId = new Map(meals.map((meal) => [meal.id, meal]));

  const dinnerLines = week.days.map((day) => {
    const mealId = plan[day.key]?.dinner;
    const meal = mealId ? byId.get(mealId) : undefined;
    const when = day.isToday ? `${day.label} (today)` : day.label;
    return `  ${when}: ${meal ? `${meal.name} (${meal.minutes} min)` : 'Nothing planned'}`;
  });

  const { remaining, checked, total } = summariseShopping(shopping);
  const budget = summariseShoppingBudget(total, weeklyBudget);

  const shoppingLines =
    remaining.length === 0
      ? ['  Nothing left to buy.']
      : remaining.map((item) => `  - ${item.quantity > 1 ? `${item.name} ×${item.quantity} ${item.unit}` : item.name}`);

  const lines = [
    `AshHome weekly plan — ${week.days[0]?.date} to ${week.days[6]?.date}`,
    '',
    'This week\'s dinners:',
    ...dinnerLines,
    '',
    `Shopping list (${remaining.length} item${remaining.length === 1 ? '' : 's'} left, ${checked.length} already in the trolley):`,
    ...shoppingLines,
    '',
    `Estimated total: ${nzd(total)}${budget ? ` (weekly budget ${nzd(budget.target)}, ${budget.over ? `${nzd(Math.abs(budget.remaining))} over` : `${nzd(budget.remaining)} left`})` : ''}`,
    '',
    'Sent from Agrocer at your request.',
  ];

  return {
    subject: `AshHome weekly plan — ${week.days[0]?.date} to ${week.days[6]?.date}`,
    text: lines.join('\n'),
  };
}
