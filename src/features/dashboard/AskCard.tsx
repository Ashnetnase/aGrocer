'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckIcon, SendHorizonalIcon, SparklesIcon, Volume2Icon, VolumeXIcon } from 'lucide-react';
import {
  askAshHome,
  confirmProposal,
  describeToolsUsed,
  type AskFailure,
  type AskProposal,
  type AskHistoryMessage,
} from '@/features/ask/askAshHome';
import { useAgrocer } from '@/providers/AgrocerProvider';
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
 * Since slice 9b it can also propose gated shopping changes and recipe saves. It never performs
 * it. The proposal appears as a sentence with Add and Cancel, and only Add calls the server.
 * On a shared kitchen wall, where anyone passing can talk to the tablet, a model that changed
 * the list on its own say-so would be a bad idea however good the model was.
 *
 * Conversation context is short and session-only. It resets when this card is left or cleared;
 * it is never stored in the database or browser storage.
 */

const EXAMPLES = [
  'What are we having for dinner?',
  'What is still on the shopping list?',
  'Add milk to the shopping list',
  'Find a chicken curry recipe',
];

type State =
  | { status: 'idle' }
  | { status: 'asking'; question: string }
  | {
      status: 'answered';
      question: string;
      reply: string;
      toolsUsed: string[];
      proposal?: AskProposal;
    }
  | { status: 'confirming'; question: string; reply: string; proposal: AskProposal }
  | { status: 'done'; question: string; result: string }
  | { status: 'failed'; question: string; failure: AskFailure };

export function AskCard({ className }: { className?: string }) {
  const { refreshShopping, refreshMeals } = useAgrocer();
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });
  const inFlight = useRef<AbortController | null>(null);
  const history = useRef<AskHistoryMessage[]>([]);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);

  // A wall tablet stays mounted for weeks, but the route can still be left mid-question.
  useEffect(
    () => () => {
      inFlight.current?.abort();
      recognition.current?.stop();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );

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
      const answer = await askAshHome(trimmed, controller.signal, history.current);
      history.current = [
        ...history.current,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: answer.reply },
      ].slice(-8) as AskHistoryMessage[];
      speakText(answer.reply, setSpeaking);
      setState({
        status: 'answered',
        question: trimmed,
        reply: answer.reply,
        toolsUsed: answer.toolsUsed,
        proposal: answer.proposal,
      });
      setQuestion('');
    } catch (error) {
      // An abort means a newer question replaced this one, or the card went away.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setState({ status: 'failed', question: trimmed, failure: error as AskFailure });
    }
  }

  /** Carries out a proposal the family agreed to. Only this path ever writes. */
  async function confirm(question: string, proposal: AskProposal) {
    setState({ status: 'confirming', question, reply: '', proposal });
    try {
      const result = await confirmProposal(proposal);
      // The write went through `/api/ai/confirm`, not a repository method, so nothing else
      // knows the list changed. Without this the Shopping card sits next to a card saying
      // "Added Milk" while still showing an empty list — one source of truth, visibly broken.
      await Promise.all([refreshShopping(), refreshMeals()]);
      const savedRecipe = proposal.actions.some((action) => action.tool === 'addRecipeToMeals');
      setState({
        status: 'done',
        question,
        result: savedRecipe ? `${result} Open Meals and choose Plan dinner.` : result,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setState({ status: 'failed', question, failure: error as AskFailure });
    }
  }

  const busy = state.status === 'asking' || state.status === 'confirming';

  return (
    <DashboardCard
      className={className}
      title="Ask AshHome"
      meta={busy ? 'Thinking…' : undefined}
      note="Can read your list, pantry and meal plan, search for recipes, and — once you confirm — add to the list or save a recipe. It cannot change anything else, or see the calendar, chores or school yet."
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

              {(state.status === 'answered' || state.status === 'confirming') && state.reply ? (
                <div className="mt-2 flex items-start gap-2">
                  <p aria-live="polite" className="whitespace-pre-wrap text-lg text-ink">
                    {state.reply}
                  </p>
                  <button
                    type="button"
                    aria-label={speaking ? 'Stop speaking' : 'Read answer aloud'}
                    title={speaking ? 'Stop speaking' : 'Read answer aloud'}
                    onClick={() => speak(state.reply, setSpeaking)}
                    className="shrink-0 rounded-full p-2 text-muted transition-colors hover:bg-canvas hover:text-ink"
                  >
                    {speaking ? <VolumeXIcon className="h-5 w-5" aria-hidden /> : <Volume2Icon className="h-5 w-5" aria-hidden />}
                  </button>
                </div>
              ) : null}

              {state.status === 'done' ? (
                <p
                  aria-live="polite"
                  className="mt-2 flex items-start gap-2 text-lg font-semibold text-moss-700"
                >
                  <CheckIcon className="mt-1 h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden />
                  {state.result}
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

        {/*
          The gate lives OUTSIDE the scrolling area, pinned above the input. Inside it, a
          60-word answer pushed the buttons below the fold — and a confirmation you have to
          scroll to find is not a confirmation. The sentence is the server's, built from
          validated arguments, so what is agreed to is exactly what will run: never the
          model's paraphrase of it.
        */}
        {state.status === 'answered' && state.proposal ? (
          <div className="shrink-0 rounded-2xl border border-moss-200 bg-moss-50 p-3">
            <p className="text-base font-semibold text-ink">
              {state.proposal.actions.length === 1
                ? 'Confirm this change?'
                : 'Confirm these changes?'}
            </p>
            <ul
              aria-label="Proposed household changes"
              className="mt-2 max-h-32 space-y-1 overflow-y-auto text-base text-ink"
            >
              {state.proposal.actions.map((action, index) => (
                <li key={`${action.tool}-${index}`} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{action.description}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => void confirm(state.question, state.proposal as AskProposal)}
                className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-2xl bg-moss-700 px-5 text-base font-bold text-white transition-colors hover:bg-moss-800"
              >
                <CheckIcon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                {proposalConfirmLabel(state.proposal)}
              </button>
              <button
                type="button"
                onClick={() => setState({ status: 'idle' })}
                className="min-h-[2.75rem] rounded-2xl border border-line bg-surface px-5 text-base font-bold text-ink transition-colors hover:bg-line"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {state.status === 'confirming' ? (
          <p className="shrink-0 text-base font-semibold text-muted">Applying…</p>
        ) : null}

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
            type="button"
            aria-label={listening ? 'Stop listening' : 'Ask using your voice'}
            title={listening ? 'Stop listening' : 'Ask using your voice'}
            onClick={() => toggleListening(setQuestion, setListening, recognition, ask)}
            disabled={busy}
            className={cn(
              'flex min-h-[3.25rem] shrink-0 items-center justify-center rounded-2xl px-4 text-base font-bold transition-colors',
              listening ? 'bg-clay-600 text-white' : 'bg-canvas text-ink hover:bg-moss-50',
              busy && 'cursor-not-allowed opacity-50',
            )}
          >
            <span aria-hidden>{listening ? '■' : '🎙️'}</span>
          </button>
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
        {history.current.length > 0 && !busy ? (
          <button
            type="button"
            onClick={() => {
              history.current = [];
              setState({ status: 'idle' });
            }}
            className="self-start text-sm font-semibold text-muted underline underline-offset-2 hover:text-ink"
          >
            New conversation
          </button>
        ) : null}
      </div>
    </DashboardCard>
  );
}

function speak(text: string, setSpeaking: (speaking: boolean) => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.onend = () => setSpeaking(false);
  utterance.onerror = () => setSpeaking(false);
  setSpeaking(true);
  window.speechSynthesis.speak(utterance);
}

function speakText(text: string, setSpeaking: (speaking: boolean) => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.onend = () => setSpeaking(false);
  utterance.onerror = () => setSpeaking(false);
  setSpeaking(true);
  window.speechSynthesis.speak(utterance);
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function toggleListening(
  setQuestion: (question: string) => void,
  setListening: (listening: boolean) => void,
  recognitionRef: { current: SpeechRecognitionLike | null },
  ask: (question: string) => Promise<void>,
) {
  if (recognitionRef.current) {
    recognitionRef.current.stop();
    recognitionRef.current = null;
    setListening(false);
    return;
  }
  if (typeof window === 'undefined') return;
  const SpeechRecognition = (window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
    ?? (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setQuestion('Voice input is not supported in this browser.');
    return;
  }
  const instance = new SpeechRecognition();
  instance.lang = 'en-NZ';
  instance.interimResults = false;
  instance.maxAlternatives = 1;
  instance.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim();
    if (transcript) {
      setQuestion(transcript);
      void ask(transcript);
    }
  };
  instance.onerror = () => setListening(false);
  instance.onend = () => {
    recognitionRef.current = null;
    setListening(false);
  };
  recognitionRef.current = instance;
  setListening(true);
  instance.start();
}

function proposalConfirmLabel(proposal: AskProposal): string {
  const recipeCount = proposal.actions.filter((action) => action.tool === 'addRecipeToMeals').length;
  const shoppingCount = proposal.actions.filter((action) => action.tool === 'addShoppingItem').length;
  if (recipeCount > 0 && shoppingCount === 0) return recipeCount === 1 ? 'Save recipe' : 'Save recipes';
  if (shoppingCount > 0 && recipeCount === 0) return shoppingCount === 1 ? 'Add it' : 'Add all';
  return proposal.actions.length === 1 ? 'Confirm' : 'Confirm all';
}
