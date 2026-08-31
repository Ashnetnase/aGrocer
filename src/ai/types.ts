/**
 * Provider-agnostic AI contracts (AshHome Phase 8).
 *
 * The rest of AshHome talks to `AiProvider` and never to Ollama. Swapping qwen3 for gemma,
 * or Ollama for a cloud fallback, must not touch a route handler or a feature — the same
 * rule ADR-003 applies to persistence, applied to inference.
 *
 * Tool calling arrived with Phase 9 slice 9a: a provider may be handed a fixed set of tool
 * specifications and may answer with calls to them. The provider never executes anything —
 * it reports what the model asked for, and `src/ai/tools/` decides whether that is allowed.
 *
 * Deliberately absent, and belonging to later phases:
 *   - streaming — the wall dashboard can wait for a whole answer before it needs tokens.
 *   - conversation persistence — the application owns permanent state, not the model, and
 *     no AI phase writes to the database until Phase 9 says so.
 */

export type AiRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AiMessage {
  role: AiRole;
  content: string;
  /** Set on a `tool` message: which tool produced this content. */
  toolName?: string;
}

/**
 * What the model is told a tool looks like.
 *
 * `parameters` is a JSON Schema object. Every Phase 9a tool takes no arguments, so these are
 * all empty — which is the point: nothing the model emits can widen what a tool reads.
 */
export interface AiToolSpec {
  name: string;
  description: string;
  parameters: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
}

/** A tool the model asked for. Asking is not permission — see `src/ai/tools/registry.ts`. */
export interface AiToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiChatRequest {
  messages: AiMessage[];
  /** Tools the model may call this turn. Omitted means it may call none. */
  tools?: AiToolSpec[];
  /** 0 is deterministic. Left to the provider's default when omitted. */
  temperature?: number;
  /** Overrides the provider's configured timeout for one slow call. */
  timeoutMs?: number;
}

export interface AiChatResult {
  /** The answer text, trimmed. Never the model's reasoning scratchpad. */
  content: string;
  /** Tools the model asked to call. Empty on a plain answer. */
  toolCalls: AiToolCall[];
  /** Which model actually answered, as reported by the provider, not as requested. */
  model: string;
  /** Completion tokens, where the provider reports them. */
  tokens?: number;
  durationMs: number;
}

export interface AiHealth {
  reachable: boolean;
  /** True only when the configured model is present and usable. */
  modelReady: boolean;
  /** Provider version string where available — Ollama reports one. */
  version?: string;
  /** Models the provider has available, for a "did you mean" in the failure message. */
  availableModels?: string[];
}

export interface AiProvider {
  /** Stable identifier for logs and responses: `ollama`, later `openai`, and so on. */
  readonly name: string;
  /** The model this provider instance is configured to use. */
  readonly model: string;
  chat(request: AiChatRequest): Promise<AiChatResult>;
  health(): Promise<AiHealth>;
}

/**
 * Why a call failed, in terms the caller can act on.
 *
 * `unreachable` and `modelMissing` are setup problems the developer fixes; `timeout` and
 * `upstream` are runtime problems the UI should report as a temporary failure. Keeping them
 * apart is what lets the route return an honest status code without leaking a hostname.
 */
export type AiErrorKind = 'unreachable' | 'modelMissing' | 'timeout' | 'upstream' | 'config';

export class AiError extends Error {
  readonly kind: AiErrorKind;
  /** Safe to show a user. `message` may carry the provider address and stays server-side. */
  readonly publicMessage: string;

  constructor(kind: AiErrorKind, message: string, publicMessage: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'AiError';
    this.kind = kind;
    this.publicMessage = publicMessage;
  }
}
