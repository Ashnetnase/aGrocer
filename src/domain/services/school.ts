import type { HouseholdMember } from '../schemas/household';
import type { SchoolNotification } from '../schemas/school';

/**
 * Notifications the Kids screen and the dashboard card should actually show: not dismissed,
 * ordered so an unread action-required item beats an already-handled one regardless of age —
 * the information hierarchy CLAUDE.md asks for ("urgent family/school actions" first).
 */
export function visibleNotifications(notifications: SchoolNotification[]): SchoolNotification[] {
  return notifications
    .filter((notification) => !notification.dismissed)
    .slice()
    .sort((a, b) => {
      const urgency = (n: SchoolNotification) => Number(n.actionRequired) * 2 + Number(!n.read);
      const byUrgency = urgency(b) - urgency(a);
      if (byUrgency !== 0) return byUrgency;
      return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
    });
}

/** The wall dashboard's Kids card shows a name, not an id, for each notification. */
export function childName(members: HouseholdMember[], childId: string | null): string | null {
  if (!childId) return null;
  return members.find((member) => member.id === childId)?.name ?? null;
}
