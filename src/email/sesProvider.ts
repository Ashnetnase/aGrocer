import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { EmailError, type EmailMessage, type EmailProvider } from './types';

/**
 * Amazon SES (Stage 5). The only implementation today — see `provider.ts`.
 *
 * Credentials are read the standard AWS SDK way (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` /
 * `AWS_REGION`, or an attached role), never hand-rolled here. `fromEmail` must be a verified SES
 * sender identity — SES rejects anything else, which is a real error worth surfacing, not
 * swallowing.
 */
export interface SesProviderOptions {
  fromEmail: string;
  region?: string;
}

export function createSesEmailProvider(options: SesProviderOptions): EmailProvider {
  const client = new SESv2Client(options.region ? { region: options.region } : {});

  return {
    name: 'ses',
    async send(message: EmailMessage) {
      try {
        await client.send(
          new SendEmailCommand({
            FromEmailAddress: options.fromEmail,
            Destination: { ToAddresses: [message.to] },
            Content: {
              Simple: {
                Subject: { Data: message.subject, Charset: 'UTF-8' },
                Body: { Text: { Data: message.text, Charset: 'UTF-8' } },
              },
            },
          }),
        );
      } catch (error) {
        throw new EmailError(
          'rejected',
          `SES rejected the email to ${message.to}: ${error instanceof Error ? error.message : String(error)}`,
          'Could not send that email. Check the sending address is verified in SES and try again.',
          error,
        );
      }
    },
  };
}
