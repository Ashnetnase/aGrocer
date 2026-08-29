'use client';

import { useEffect, useState } from 'react';
import { AlertTriangleIcon, ClipboardPasteIcon } from 'lucide-react';
import type { MealDraft } from '@/domain/schemas/meal';
import { importRecipeText } from '@/domain/services/recipeImport';
import { formatMealIngredient } from '@/domain/services/meals';
import { BottomSheet } from '@/components/agrocer/BottomSheet';

/**
 * Paste a recipe, review what was understood, then open the normal meal form (Stage 4).
 *
 * The review step is the point. Import guesses; a person confirms. Nothing is saved from this
 * sheet — pressing the button hands a **draft** to `MealFormSheet`, where every field is
 * editable and the usual validation applies. That keeps one path into the meal store rather
 * than a second, looser one.
 *
 * Text is pasted rather than fetched from a URL. Fetching would have the server request
 * arbitrary addresses from a home network that also hosts Vaultwarden, Proxmox and an
 * unauthenticated Ollama; see the note in `recipeImport.ts`.
 */

interface RecipeImportSheetProps {
  open: boolean;
  onClose: () => void;
  /** Hands the reviewed draft to the meal form. This sheet never writes anything itself. */
  onImport: (draft: MealDraft) => void;
}

export function RecipeImportSheet({ open, onClose, onImport }: RecipeImportSheetProps) {
  const [text, setText] = useState('');

  // A sheet that reopens holding the last recipe would be a small horror.
  useEffect(() => {
    if (!open) setText('');
  }, [open]);

  const recipe = text.trim() === '' ? undefined : importRecipeText(text);
  const found = recipe?.ingredients.length ?? 0;

  function handleImport() {
    if (!recipe || found === 0) return;
    onImport({
      name: recipe.name ?? 'Imported recipe',
      minutes: recipe.minutes ?? 30,
      serves: recipe.serves ?? 4,
      tags: [],
      image: undefined,
      description: recipe.description ?? '',
      ingredients: recipe.ingredients.map(formatMealIngredient),
      ingredientDetails: recipe.ingredients,
    });
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Paste a recipe"
      description="Copy a recipe from anywhere and paste it here. You'll check it before it's saved."
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
            Review and edit
          </button>
        </div>
      }
    >
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={8}
        aria-label="Recipe text"
        placeholder={'Spaghetti Bolognese\nServes 4\n\nIngredients\n500g beef mince\n1 onion, diced\n…'}
        className="w-full resize-y rounded-2xl border border-line bg-canvas p-3.5 text-[15px] leading-relaxed text-ink placeholder:text-muted focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-100"
      />

      {recipe ? (
        <div className="mt-4">
          {found === 0 ? (
            <p className="text-sm font-semibold text-clay-600">
              No ingredients found. Recipes usually work best pasted whole, including the
              &ldquo;Ingredients&rdquo; heading.
            </p>
          ) : (
            <>
              <p className="text-[13px] font-bold text-ink">
                Found {found} ingredient{found === 1 ? '' : 's'}
                {recipe.name ? ` for “${recipe.name}”` : ''}
                {recipe.serves ? ` · serves ${recipe.serves}` : ''}
                {recipe.minutes ? ` · ${recipe.minutes} min` : ''}
              </p>
              <ul className="mt-2 space-y-1">
                {recipe.ingredients.map((ingredient, index) => (
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
          {recipe.unparsed.length > 0 ? (
            <div className="mt-3 rounded-xl bg-canvas p-3">
              <p className="flex items-center gap-1.5 text-[13px] font-bold text-clay-600">
                <AlertTriangleIcon className="h-4 w-4 shrink-0" aria-hidden />
                Couldn&rsquo;t read {recipe.unparsed.length} line
                {recipe.unparsed.length === 1 ? '' : 's'} — add {recipe.unparsed.length === 1 ? 'it' : 'them'} by hand
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {recipe.unparsed.map((line, index) => (
                  <li key={`${line}-${index}`} className="truncate text-sm text-muted">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-muted">
          <ClipboardPasteIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Amounts, servings and cooking time are picked up where they appear. Anything that
          cannot be read is listed rather than guessed at.
        </p>
      )}
    </BottomSheet>
  );
}
