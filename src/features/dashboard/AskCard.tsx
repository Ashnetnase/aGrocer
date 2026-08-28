'use client';

import { useEffect, useRef, useState } from 'react';
import { SendHorizonalIcon, SparklesIcon } from 'lucide-react';
import { askAshHome, describeToolsUsed, type AskFailure } from '@/features/ask/askAshHome';
import { cn } from '@/lib/utils';
import { DashboardCard } from './DashboardCard';

/**
 * "Ask AshHome" on the wall dashboard (Phase 9, slice 9a).
 *
 * The question goes to `/api/ai/ask`, which runs the local Ollama with the read-only tool
 * allow-list. The assistant can now look up the shopping list, the pantry and the meal plan,
 * so the examples below are the ones from the master plan that this slice makes true.
 *
 * Still limited, and the footnote still says so: it cannot change anything, and it cannot see
 * the calendar, chores, reminders or school information, because none of that exists as data
 * yet. An assistant on a kitchen wall that appears to know something and is guessing is worse
 * than one that admits it cannot look.
 *
 * When an answer came from a tool, the card says which — "Checked your pantry". A family
 * should be able to tell at a glance whether they are reading their own data or the model's
 * general knowledge.
 *
 * Deliberately no conversation history. Each question stands alone: a shared tablet in a
 * family room should not accumulate a transcript nobody chose to keep, and the application,
 * not the model, owns anything worth remembering.
 */

const EXAMPLES = [
  'What are we having for dinner?',
  'What is still on the shopping list?',
  'What can I make with what we have?',
];

type State =
  | { status: 'idle' }
  | { status: 'asking'; question: string }
  | { status: 'answered'; question: string; reply: string; toolsUsed: string[] }
  | { status: 'failed'; question: string; failure: AskFailure };

export function AskCard({ className }: { className?: string }) {
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });
  const inFlight = useRef<AbortController | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  // A wall tablet stays mounted for weeks, but the route can still be left mid-question.
  useEffect(() => () => inFlight.current?.abort(), []);

  // Scroll a fresh answer into view rather than leaving the previous one's tail showing.
  useEffect(() => {
    if (state.status === 'answered') answerRef.current?.scrollTo({ top: 0 });
  }, [state]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed === '') return;

    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    setState({ status: 'asking', question: trimmed });
    try {
      const answer = await askAshHome(trimmed, controller.signal);
      setState({
        status: 'answered',
        question: trimmed,
        reply: answer.reply,
        toolsUsed: answer.toolsUsed,
      });
      setQuestion('');
    } catch (error) {
      // An abort means a newer question replaced this one, or the card went away.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setState({ status: 'failed', question: trimmed, failure: error as AskFailure });
    }
  }

  const busy = state.status === 'asking';

  return (
    <DashboardCard
      className={className}
      title="Ask AshHome"
      meta={busy ? 'Thinking…' : undefined}
      note="Can read your shopping list, pantry and meal plan. It cannot change anything, and cannot see the calendar, chores or school yet."
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div ref={answerRef} className="min-h-0 flex-1 overflow-y-auto">
          {state.status === 'idle' ? (
            <ul className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => void ask(example)}
                    className="rounded-full bg-canvas px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-moss-50 hover:text-moss-700"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div>
              {/*
                The question and what was consulted share a row. Putting the provenance under
                a 60-word answer buried it below the fold on a short card — and a line saying
                "this came from your pantry" is worthless if you have to scroll to find it.
              */}
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-bold text-muted">{state.question}</p>
                {state.status === 'answered' && describeToolsUsed(state.toolsUsed) ? (
                  <p className="shrink-0 text-sm font-semibold text-moss-700">
                    {describeToolsUsed(state.toolsUsed)}
                  </p>
                ) : null}
              </div>

              {state.status === 'asking' ? (
                <p className="mt-2 flex items-center gap-2 text-lg text-muted">
                  <SparklesIcon className="h-5 w-5 animate-pulse" aria-hidden />
                  Thinking…
                </p>
              ) : null}

              {state.status === 'answered' ? (
                // `aria-live` so the answer is announced rather than silently appearing.
                <p aria-live="polite" className="mt-2 whitespace-pre-wrap text-lg text-ink">
                  {state.reply}
                </p>
              ) : null}

              {state.status === 'failed' ? (
                <div aria-live="polite" className="mt-2">
                  <p className="text-lg font-semibold text-clay-600">{state.failure.message}</p>
                  {state.failure.retryable ? (
                    <button
                      type="button"
                      onClick={() => void ask(state.question)}
                      className="mt-2 rounded-full bg-canvas px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-moss-50"
                    >
                      Try again
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <form
          className="flex shrink-0 items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void ask(question);
          }}
        >
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask a cooking or household question…"
            aria-label="Ask AshHome a question"
            // Tall enough to hit on a wall tablet, and large enough to read while typing.
            className="min-h-[3.25rem] w-full rounded-2xl border border-line bg-canvas px-4 text-lg text-ink outline-none transition-colors placeholder:text-muted focus:border-moss-600"
          />
          <button
            type="submit"
            disabled={busy || question.trim() === ''}
            className={cn(
              'flex min-h-[3.25rem] shrink-0 items-center gap-2 rounded-2xl px-6 text-base font-bold text-white transition-colors',
              busy || question.trim() === ''
                ? 'cursor-not-allowed bg-line'
                : 'bg-moss-700 hover:bg-moss-800',
            )}
          >
            <SendHorizonalIcon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            Ask
          </button>
        </form>
      </div>
    </DashboardCard>
  );
}
