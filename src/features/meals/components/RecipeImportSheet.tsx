'use client';

import { useEffect, useState } from 'react';
import { AlertTriangleIcon, ClipboardPasteIcon, SearchIcon } from 'lucide-react';
import type { MealDraft, MealIngredient } from '@/domain/schemas/meal';
import { importRecipeText } from '@/domain/services/recipeImport';
import { formatMealIngredient } from '@/domain/services/meals';
import { BottomSheet } from '@/components/agrocer/BottomSheet';
import { cn } from '@/lib/utils';

/**
 * Bring a recipe in from outside, review it, then open the normal meal form (Stage 4).
 *
 * **Two ways in, one way out.** *Paste* handles anything — a website, a message from a friend,
 * a page someone typed out. *Search* queries the configured provider (TheMealDB today) through
 * `/api/recipes`. Both produce the same reviewable shape, and both hand a **draft** to
 * `MealFormSheet` rather than saving. One path into the meal store, whatever the source.
 *
 * The review step is the point. Import guesses; a person confirms. Nothing here writes.
 *
 * Pasting takes text, never a URL to fetch: fetching would have the server request arbitrary
 * addresses from a home network that also hosts Vaultwarden, Proxmox and an unauthenticated
 * Ollama. Search is different in kind — one known provider, behind a route that validates the
 * query and requires a signed-in household member, so it cannot be used as an open proxy.
 */

type Mode = 'paste' | 'search';

/** What both sources reduce to, so the review block is written once. */
interface Reviewable {
  name?: string;
  minutes?: number;
  serves?: number;
  ingredients: MealIngredient[];
  unparsed: string[];
  instructions?: string;
  image?: string;
}

interface SearchResult {
  id: string;
  title: string;
  category?: string;
  area?: string;
  thumbnail?: string;
}

interface RecipeImportSheetProps {
  open: boolean;
  onClose: () => void;
  /** Which source to show first. Planner entry points lead with search. */
  initialMode?: Mode;
  /** Describes what happens after the normal review form is saved. */
  destination?: 'catalogue' | 'planner';
  /** Hands the reviewed draft to the meal form. This sheet never writes anything itself. */
  onImport: (draft: MealDraft) => void;
}

export function RecipeImportSheet({
  open,
  onClose,
  initialMode = 'paste',
  destination = 'catalogue',
  onImport,
}: RecipeImportSheetProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [chosen, setChosen] = useState<Reviewable | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  // A sheet that reopens holding the last recipe would be a small horror.
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      return;
    }
    setMode(initialMode);
    setText('');
    setQuery('');
    setResults([]);
    setChosen(undefined);
    setError(undefined);
  }, [initialMode, open]);

  const pasted = text.trim() === '' ? undefined : importRecipeText(text);
  const review: Reviewable | undefined = mode === 'paste' ? pasted : chosen;
  const found = review?.ingredients.length ?? 0;

  async function runSearch() {
    if (query.trim().length < 2 || busy) return;
    setBusy(true);
    setError(undefined);
    setChosen(undefined);
    try {
      const response = await fetch(`/api/recipes?q=${encodeURIComponent(query.trim())}`);
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        setError(typeof body?.error === 'string' ? body.error : 'Recipe search failed.');
        setResults([]);
        return;
      }
      const recipes = Array.isArray(body?.recipes) ? (body.recipes as SearchResult[]) : [];
      setResults(recipes);
      if (recipes.length === 0) setError('Nothing found. Try a simpler word, like “chicken”.');
    } catch {
      setError('Could not reach recipe search.');
    } finally {
      setBusy(false);
    }
  }

  async function choose(id: string) {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/recipes/${encodeURIComponent(id)}`);
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok || !body?.recipe) {
        setError('Could not load that recipe.');
        return;
      }
      const recipe = body.recipe as {
        title: string;
        thumbnail?: string;
        ingredients: MealIngredient[];
        unparsed: string[];
        instructions?: string;
      };
      // No minutes or serves: TheMealDB does not publish either, and inventing them would put
      // a made-up cooking time on the wall. The form's defaults apply and can be corrected.
      setChosen({
        name: recipe.title,
        ingredients: recipe.ingredients,
        unparsed: recipe.unparsed,
        instructions: recipe.instructions?.trim() || undefined,
        image: recipe.thumbnail,
      });
      setResults([]);
    } catch {
      setError('Could not reach recipe search.');
    } finally {
      setBusy(false);
    }
  }

  function handleImport() {
    if (!review || found === 0) return;
    onImport({
      name: review.name ?? 'Imported recipe',
      minutes: review.minutes ?? 30,
      serves: review.serves ?? 4,
      tags: [],
      image: review.image,
      description: '',
      instructions: review.instructions,
      ingredients: review.ingredients.map(formatMealIngredient),
      ingredientDetails: review.ingredients,
    });
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={destination === 'planner' ? 'Find a recipe' : 'Add a recipe'}
      description={
        destination === 'planner'
          ? "Search or paste a recipe. You'll review it before it is saved and planned."
          : "Paste one from anywhere, or search. You'll check it before it's saved."
      }
      footer={
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-2xl border border-line bg-canvas text-[15px] font-bold text-ink transition-colors duration-150 ease-out hover:bg-line"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={found === 0}
            className="h-12 flex-1 rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700 disabled:cursor-not-allowed disabled:bg-line"
          >
            {destination === 'planner' ? 'Review and plan' : 'Review and edit'}
          </button>
        </div>
      }
    >
      <div className="mb-3 flex gap-2" role="group" aria-label="How to add the recipe">
        {(['paste', 'search'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            aria-pressed={mode === option}
            className={cn(
              'h-9 flex-1 rounded-full text-[13px] font-semibold transition-colors duration-150 ease-out',
              mode === option
                ? 'bg-moss-600 text-white'
                : 'border border-line bg-surface text-muted hover:text-ink',
            )}
          >
            {option === 'paste' ? 'Paste' : 'Search'}
          </button>
        ))}
      </div>

      {mode === 'paste' ? (
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={7}
          aria-label="Recipe text"
          placeholder={'Spaghetti Bolognese\nServes 4\n\nIngredients\n500g beef mince\n1 onion, diced\n…'}
          className="w-full resize-y rounded-2xl border border-line bg-canvas p-3.5 text-[15px] leading-relaxed text-ink placeholder:text-muted focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-100"
        />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch();
          }}
          className="flex gap-2"
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search recipes"
            placeholder="e.g. chicken curry"
            className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[15px] text-ink placeholder:text-muted focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-100"
          />
          <button
            type="submit"
            disabled={busy || query.trim().length < 2}
            className="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-moss-600 px-4 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700 disabled:cursor-not-allowed disabled:bg-line"
          >
            <SearchIcon className="h-4 w-4" /> {busy ? '…' : 'Find'}
          </button>
        </form>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-clay-600">
          {error}
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {results.slice(0, 8).map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => void choose(result.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 text-left transition-colors duration-150 ease-out hover:border-moss-200 hover:bg-moss-50"
              >
                {result.thumbnail ? (
                  // Recipe thumbnails are remote, provider-hosted and only shown at this small
                  // fixed size, so plain `img` is simpler than registering every provider host.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.thumbnail} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                ) : null}
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-ink">{result.title}</span>
                  {result.category || result.area ? (
                    <span className="block text-xs text-muted">
                      {[result.area, result.category].filter(Boolean).join(' · ')}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {review ? (
        <div className="mt-4">
          {found === 0 ? (
            <p className="text-sm font-semibold text-clay-600">
              No ingredients found. Pasted recipes work best whole, including the
              &ldquo;Ingredients&rdquo; heading.
            </p>
          ) : (
            <>
              <p className="text-[13px] font-bold text-ink">
                Found {found} ingredient{found === 1 ? '' : 's'}
                {review.name ? ` for “${review.name}”` : ''}
                {review.serves ? ` · serves ${review.serves}` : ''}
                {review.minutes ? ` · ${review.minutes} min` : ''}
              </p>
              <ul className="mt-2 space-y-1">
                {review.ingredients.map((ingredient, index) => (
                  <li
                    key={`${ingredient.name}-${index}`}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="truncate text-ink">{ingredient.name}</span>
                    <span className="shrink-0 text-muted">
                      {ingredient.amount} {ingredient.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/*
            Shown, never swallowed. A line the importer could not read is the person's to
            decide about — quietly dropping an ingredient is the failure that makes an
            importer untrustworthy.
          */}
          {review.unparsed.length > 0 ? (
            <div className="mt-3 rounded-xl bg-canvas p-3">
              <p className="flex items-center gap-1.5 text-[13px] font-bold text-clay-600">
                <AlertTriangleIcon className="h-4 w-4 shrink-0" aria-hidden />
                Couldn&rsquo;t read {review.unparsed.length} line
                {review.unparsed.length === 1 ? '' : 's'} — add{' '}
                {review.unparsed.length === 1 ? 'it' : 'them'} by hand
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {review.unparsed.map((line, index) => (
                  <li key={`${line}-${index}`} className="truncate text-sm text-muted">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {review.instructions ? (
            <div className="mt-3 rounded-xl bg-canvas p-3">
              <p className="text-[13px] font-bold text-ink">How to cook it</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">{review.instructions}</p>
            </div>
          ) : null}
        </div>
      ) : mode === 'paste' ? (
        <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-muted">
          <ClipboardPasteIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Amounts, servings and cooking time are picked up where they appear. Anything that
          cannot be read is listed rather than guessed at.
        </p>
      ) : null}
    </BottomSheet>
  );
}
