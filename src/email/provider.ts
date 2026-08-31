import { createSesEmailProvider } from './sesProvider';
import { EmailError, type EmailProvider } from './types';

/**
 * Server-side email provider resolution (AshHome, Stage 5).
 *
 * The single place that decides which provider AshHome sends through, mirroring
 * `src/ai/provider.ts`. `EMAIL_PROVIDER` selects it; today `ses` is the only implementation.
 *
 * Server-only. Must never be imported from a client component — it reads AWS credentials from
 * the environment.
 */

const globalForEmail = globalThis as typeof globalThis & { __ashhomeEmailProvider?: EmailProvider };

export function getEmailProvider(): EmailProvider {
  if (globalForEmail.__ashhomeEmailProvider) return globalForEmail.__ashhomeEmailProvider;

  const name = process.env.EMAIL_PROVIDER ?? 'ses';
  if (name !== 'ses') {
    throw new EmailError(
      'config',
      `EMAIL_PROVIDER="${name}" is not implemented. Only "ses" exists.`,
      'Email is not configured.',
    );
  }

  const fromEmail = process.env.SES_FROM_EMAIL;
  if (!fromEmail) {
    throw new EmailError(
      'config',
      'SES_FROM_EMAIL is not set.',
      'Email is not configured yet.',
    );
  }

  const provider = createSesEmailProvider({ fromEmail, region: process.env.AWS_REGION });
  globalForEmail.__ashhomeEmailProvider = provider;
  return provider;
}

/** Test seam: drops the cached provider so the next call re-reads the environment. */
export function resetEmailProvider(): void {
  globalForEmail.__ashhomeEmailProvider = undefined;
}
