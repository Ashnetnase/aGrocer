'use client';

import { useEffect, useState } from 'react';
import {
  ClockIcon,
  HeartIcon,
  MehIcon,
  RefreshCwIcon,
  ShoppingCartIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react';
import type { MealFeedback, MealFeedbackDraft, MealRating } from '@/domain/schemas/feedback';
import type { HouseholdMember } from '@/domain/schemas/household';
import type { Meal } from '@/domain/schemas/meal';
import type { Product } from '@/domain/schemas/product';
import { MEAL_RATING_LABELS } from '@/domain/services/feedback';
import { estimateMealCost } from '@/domain/services/meals';
import { nzd } from '@/lib/format';
import { BottomSheet } from '@/components/agrocer/BottomSheet';
import { MealImage } from '@/components/agrocer/MealImage';

interface MealDetailSheetProps {
  open: boolean;
  onClose: () => void;
  meal: Meal | null;
  products: Product[];
  members: HouseholdMember[];
  ateOn: string;
  dayLabel: string;
  slotLabel: string;
  onChange: () => void;
  onRemove: () => void;
  onAddIngredients: () => void;
  ingredientsAdded: boolean;
  onLoadFeedback: (mealId: string) => Promise<MealFeedback[]>;
  onAddFeedback: (draft: MealFeedbackDraft) => Promise<MealFeedback>;
}

export function MealDetailSheet({
  open,
  onClose,
  meal,
  products,
  members,
  ateOn,
  dayLabel,
  slotLabel,
  onChange,
  onRemove,
  onAddIngredients,
  ingredientsAdded,
  onLoadFeedback,
  onAddFeedback,
}: MealDetailSheetProps) {
  const cost = meal ? estimateMealCost(meal, products) : undefined;
  const [feedback, setFeedback] = useState<MealFeedback[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string>();

  useEffect(() => {
    if (!open || !meal) return;
    let active = true;
    setFeedback([]);
    setFeedbackLoading(true);
    setFeedbackError(undefined);
    void onLoadFeedback(meal.id)
      .then((history) => {
        if (active) setFeedback(history);
      })
      .catch(() => {
        if (active) setFeedbackError('Could not load feedback.');
      })
      .finally(() => {
        if (active) setFeedbackLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, meal, onLoadFeedback]);

  const rate = async (rating: MealRating) => {
    if (!meal || feedbackSaving) return;
    setFeedbackSaving(true);
    setFeedbackError(undefined);
    try {
      const added = await onAddFeedback({
        mealId: meal.id,
        memberId: selectedMemberId || undefined,
        rating,
        ateOn,
      });
      setFeedback((current) => [added, ...current]);
    } catch (error) {
      setFeedbackError(
        error instanceof Error && /needs the database/i.test(error.message)
          ? 'Feedback is shared history and needs server data.'
          : 'Could not save feedback. Check the connection and try again.',
      );
    } finally {
      setFeedbackSaving(false);
    }
  };
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={meal?.name ?? ''}
      description={`${slotLabel} · ${dayLabel}`}
      footer={
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => {
              onRemove();
              onClose();
            }}
            aria-label="Remove meal from this day"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line text-berry-500 transition-colors duration-150 ease-out hover:bg-berry-50"
          >
            <Trash2Icon className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onChange();
            }}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-line bg-canvas text-[15px] font-bold text-ink transition-colors duration-150 ease-out hover:bg-line"
          >
            <RefreshCwIcon className="h-4 w-4" /> Change
          </button>
          <button
            type="button"
            onClick={onAddIngredients}
            disabled={ingredientsAdded}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700 disabled:bg-moss-100 disabled:text-moss-600"
          >
            <ShoppingCartIcon className="h-4 w-4" /> {ingredientsAdded ? 'Added' : 'Add items'}
          </button>
        </div>
      }
    >
      {meal ? (
        <div>
          <MealImage
            src={meal.image}
            width={400}
            height={160}
            className="h-40 w-full rounded-2xl"
            iconClassName="h-10 w-10"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {meal.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-moss-50 px-2.5 py-1 text-[11px] font-semibold text-moss-700">
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">{meal.description}</p>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 rounded-2xl border border-line bg-canvas px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <ClockIcon className="h-3.5 w-3.5" /> Ready in
              </p>
              <p className="mt-0.5 text-[17px] font-extrabold text-ink">{meal.minutes} min</p>
            </div>
            {cost?.complete ? (
              <div className="flex-1 rounded-2xl border border-line bg-canvas px-3 py-2.5">
                <p className="text-xs font-semibold text-muted">Est. cost</p>
                <p className="mt-0.5 text-[17px] font-extrabold text-ink">{nzd(cost.total)}</p>
              </div>
            ) : null}
            <div className="flex-1 rounded-2xl border border-line bg-canvas px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <UsersIcon className="h-3.5 w-3.5" /> Serves
              </p>
              <p className="mt-0.5 text-[17px] font-extrabold text-ink">{meal.serves} people</p>
            </div>
          </div>
          <h3 className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wider text-muted">You’ll need</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {meal.ingredients.map((ingredient) => (
              <li key={ingredient} className="bg-surface px-4 py-3 text-[15px] font-medium text-ink">
                {ingredient}
              </li>
            ))}
          </ul>

          <section className="mt-5" aria-labelledby="meal-feedback-heading">
            <h3 id="meal-feedback-heading" className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Have it again?
            </h3>
            {members.length > 0 ? (
              <label className="mt-2 block text-xs font-semibold text-muted">
                Who is rating?
                <select
                  value={selectedMemberId}
                  onChange={(event) => setSelectedMemberId(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-100"
                >
                  <option value="">Whole family</option>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </label>
            ) : null}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {RATING_OPTIONS.map(({ rating, Icon }) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => void rate(rating)}
                  disabled={feedbackSaving}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-2 text-sm font-semibold text-ink hover:border-moss-300 hover:bg-moss-50 disabled:opacity-50"
                >
                  <Icon className="h-4 w-4 text-moss-600" aria-hidden />
                  {MEAL_RATING_LABELS[rating]}
                </button>
              ))}
            </div>
            {feedbackError ? <p role="alert" className="mt-2 text-sm font-medium text-berry-600">{feedbackError}</p> : null}
            {feedbackLoading ? (
              <p className="mt-3 text-sm text-muted">Loading recent feedback…</p>
            ) : feedback.length > 0 ? (
              <ul className="mt-3 space-y-1.5" aria-label="Recent feedback">
                {feedback.slice(0, 3).map((entry) => {
                  const member = members.find((candidate) => candidate.id === entry.memberId);
                  return (
                    <li key={entry.id} className="flex justify-between gap-3 rounded-xl bg-moss-50 px-3 py-2 text-sm">
                      <span className="font-semibold text-ink">{member?.name ?? 'Family'}: {MEAL_RATING_LABELS[entry.rating]}</span>
                      <time dateTime={entry.ateOn} className="shrink-0 text-xs text-muted">{entry.ateOn}</time>
                    </li>
                  );
                })}
              </ul>
            ) : !feedbackError ? (
              <p className="mt-3 text-sm text-muted">No feedback yet.</p>
            ) : null}
          </section>
        </div>
      ) : null}
    </BottomSheet>
  );
}

const RATING_OPTIONS = [
  { rating: 'loved', Icon: HeartIcon },
  { rating: 'liked', Icon: ThumbsUpIcon },
  { rating: 'ok', Icon: MehIcon },
  { rating: 'disliked', Icon: ThumbsDownIcon },
] as const;
