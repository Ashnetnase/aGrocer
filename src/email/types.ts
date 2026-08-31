/**
 * Provider-agnostic email contracts (AshHome, Stage 5).
 *
 * The same seam as `AiProvider` (ADR-014) and the repositories (ADR-003): features depend on
 * `EmailProvider`, never on AWS SES directly, and exactly one place decides which
 * implementation answers. Nothing here decides *when* to send or *what* to write — that is a
 * route handler assembling real household data, never free text a model invented, matching the
 * project-wide rule that nothing sent to a family member is guessed at.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  /** Stable identifier for logs: `ses`, later others. */
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

export type EmailErrorKind = 'config' | 'unreachable' | 'rejected';

export class EmailError extends Error {
  readonly kind: EmailErrorKind;
  /** Safe to show a person. `message` may carry provider detail and stays server-side. */
  readonly publicMessage: string;

  constructor(kind: EmailErrorKind, message: string, publicMessage: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'EmailError';
    this.kind = kind;
    this.publicMessage = publicMessage;
  }
}
