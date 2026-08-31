import { describe, expect, it } from 'vitest';
import { childName, visibleNotifications } from './school';
import type { HouseholdMember } from '../schemas/household';
import type { SchoolNotification } from '../schemas/school';

const notification = (overrides: Partial<SchoolNotification>): SchoolNotification => ({
  id: overrides.id ?? 'n1',
  childId: null,
  provider: 'manual',
  externalReference: null,
  title: 'Notice',
  summary: '',
  receivedAt: '2026-08-01T00:00:00.000Z',
  eventDate: null,
  dueDate: null,
  actionRequired: false,
  actionType: null,
  sourceLink: null,
  read: false,
  dismissed: false,
  ...overrides,
});

describe('visibleNotifications', () => {
  it('drops dismissed notifications', () => {
    const kept = notification({ id: 'kept' });
    const gone = notification({ id: 'gone', dismissed: true });
    expect(visibleNotifications([kept, gone])).toEqual([kept]);
  });

  it('ranks unread action-required notices first, regardless of age', () => {
    const old = notification({ id: 'old', receivedAt: '2026-01-01T00:00:00.000Z' });
    const newButRead = notification({
      id: 'newButRead',
      receivedAt: '2026-08-01T00:00:00.000Z',
      read: true,
    });
    const oldButUrgent = notification({
      id: 'oldButUrgent',
      receivedAt: '2026-01-15T00:00:00.000Z',
      actionRequired: true,
    });

    const sorted = visibleNotifications([old, newButRead, oldButUrgent]);
    expect(sorted.map((n) => n.id)).toEqual(['oldButUrgent', 'old', 'newButRead']);
  });

  it('breaks ties by most recent first', () => {
    const earlier = notification({ id: 'earlier', receivedAt: '2026-01-01T00:00:00.000Z' });
    const later = notification({ id: 'later', receivedAt: '2026-02-01T00:00:00.000Z' });
    expect(visibleNotifications([earlier, later]).map((n) => n.id)).toEqual(['later', 'earlier']);
  });
});

describe('childName', () => {
  const members: HouseholdMember[] = [
    { id: 'h3', name: 'Milla', initials: 'M', role: 'Child', colour: 'bg-honey-500', school: null },
  ];

  it('returns null when there is no child id', () => {
    expect(childName(members, null)).toBeNull();
  });

  it('returns the matching member name', () => {
    expect(childName(members, 'h3')).toBe('Milla');
  });

  it('returns null when the id matches no member', () => {
    expect(childName(members, 'missing')).toBeNull();
  });
});
