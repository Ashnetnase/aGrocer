import { describe, expect, it } from 'vitest';
import type { AiProvider } from '@/ai/types';
import { extractHeroNotification } from './heroExtraction';
import type { GmailMessage } from './gmail';

const message: GmailMessage = {
  id: 'msg-1',
  from: 'Hero <noreply@linc-ed.com>',
  subject: "What's Coming Up Today?",
  date: 'Mon, Aug 31, 2026 at 7:05 AM',
  snippet: 'The following events are happening today: Year 5 Ōtakou Noho Marae…',
  bodyText: 'The following events are happening today:\nYear 5 Ōtakou Noho Marae Mon 31 Aug, 9:00am',
};

function fakeProvider(reply: string): AiProvider {
  return {
    name: 'fake',
    model: 'fake-model',
    async chat() {
      return { content: reply, toolCalls: [], model: 'fake-model', durationMs: 1 };
    },
    async health() {
      return { reachable: true, modelReady: true };
    },
  };
}

describe('extractHeroNotification', () => {
  it('maps a well-formed, confident extraction straight through', async () => {
    const reply = JSON.stringify({
      title: 'Year 5 Ōtakou Noho Marae',
      summary: 'A school trip today at 9am.',
      eventDate: '2026-08-31',
      dueDate: null,
      actionRequired: false,
      actionType: null,
      confident: true,
    });

    const draft = await extractHeroNotification(fakeProvider(reply), message);

    expect(draft).toEqual({
      childId: null,
      provider: 'hero-email',
      externalReference: 'msg-1',
      title: 'Year 5 Ōtakou Noho Marae',
      summary: 'A school trip today at 9am.',
      eventDate: '2026-08-31',
      dueDate: null,
      actionRequired: false,
      actionType: null,
      sourceLink: null,
      needsReview: false,
    });
  });

  it('flags needsReview when the model itself was not confident', async () => {
    const reply = JSON.stringify({
      title: 'Permission slip',
      summary: 'Something about a permission slip.',
      eventDate: null,
      dueDate: null,
      actionRequired: true,
      actionType: 'permission',
      confident: false,
    });

    const draft = await extractHeroNotification(fakeProvider(reply), message);
    expect(draft.needsReview).toBe(true);
  });

  it('falls back to the raw subject/snippet, flagged for review, on unparseable output', async () => {
    const draft = await extractHeroNotification(fakeProvider('not json at all'), message);

    expect(draft).toEqual({
      childId: null,
      provider: 'hero-email',
      externalReference: 'msg-1',
      title: "What's Coming Up Today?",
      summary: message.snippet,
      eventDate: null,
      dueDate: null,
      actionRequired: false,
      actionType: null,
      sourceLink: null,
      needsReview: true,
    });
  });

  it('falls back when the JSON is well-formed but fails schema validation', async () => {
    const reply = JSON.stringify({ title: '', summary: 'x', confident: true });
    const draft = await extractHeroNotification(fakeProvider(reply), message);
    expect(draft.needsReview).toBe(true);
    expect(draft.title).toBe(message.subject);
  });

  it('falls back when the provider itself throws', async () => {
    const throwingProvider: AiProvider = {
      name: 'fake',
      model: 'fake-model',
      async chat() {
        throw new Error('unreachable');
      },
      async health() {
        return { reachable: false, modelReady: false };
      },
    };

    const draft = await extractHeroNotification(throwingProvider, message);
    expect(draft.needsReview).toBe(true);
    expect(draft.externalReference).toBe('msg-1');
  });
});
