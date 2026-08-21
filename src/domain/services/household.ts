import type { HouseholdMember } from '../schemas/household';

/** "Ash" -> "A", "Mary Jane" -> "MJ". Kept to two characters for the avatar. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').charAt(0).toUpperCase();
  const first = (parts[0] ?? '').charAt(0);
  const last = (parts[parts.length - 1] ?? '').charAt(0);
  return `${first}${last}`.toUpperCase();
}

export function describeHousehold(members: HouseholdMember[]): string {
  const adults = members.filter((member) => member.role === 'Adult').length;
  const children = members.length - adults;
  const parts: string[] = [];
  if (adults > 0) parts.push(`${adults} ${adults === 1 ? 'adult' : 'adults'}`);
  if (children > 0) parts.push(`${children} ${children === 1 ? 'child' : 'children'}`);
  return parts.join(' + ') || 'No one yet';
}
