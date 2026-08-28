'use client';

import { useEffect, useRef, useState } from 'react';
import { SendHorizonalIcon, SparklesIcon } from 'lucide-react';
import { askAshHome, type AskFailure } from '@/features/ask/askAshHome';
import { cn } from '@/lib/utils';
import { DashboardCard } from './DashboardCard';

/**
 * "Ask AshHome" on the wall dashboard (Phase 8, slice 8b).
 *
 * Real now: the question goes to `/api/ai/chat`, which reaches the local Ollama on the home
 * PC. Still limited: the model has no tools, so it cannot see the shopping list, pantry, meal
 * plan or calendar, and it cannot change anything. The prompt tells it to say so, and the
 * footnote tells the family the same thing — an assistant on a kitchen wall that appears to
 * know what is in the freezer, and is guessing, is worse than no assistant.
 *
 * Deliberately no conversation history. Each question stands alone: a shared tablet in a
 * family room should not accumulate a transcript nobody chose to keep, and the application,
 * not the model, owns anything worth remembering.
 *
 * The examples are the ones this slice can honestly answer. The list-and-calendar examples
 * from the master plan arrive with the Phase 9 tools, and putting them here now would invite
 * exactly the question the model has to refuse.
 */

const EXAMPLES = [
  'What can I make with mince and rice?',
  'How long do I roast a whole chicken?',
  'Quick dinner for five, under half an hour?',
];

type State =
  | { status: 'idle' }
  | { status: 'asking'; question: string }
  | { status: 'answered'; question: string; reply: string }
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
      setState({ status: 'answered', question: trimmed, reply: answer.reply });
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
      note="Answers general questions. It cannot see your list, pantry or calendar yet, and cannot change anything — that arrives with Phase 9."
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
              <p className="text-sm font-bold text-muted">{state.question}</p>

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
