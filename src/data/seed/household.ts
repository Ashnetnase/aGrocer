import type { Household } from '@/domain/schemas/household';
import { toIsoDate } from '@/domain/services/dates';

/**
 * Ported from the Magic Patterns demo data. Settings are new in the Next.js
 * port and back the Settings screen.
 */
export const householdSeed: Household = {
  members: [
    { id: 'h1', name: 'Ash', initials: 'A', role: 'Adult', colour: 'bg-moss-600' },
    { id: 'h2', name: 'Nas', initials: 'N', role: 'Adult', colour: 'bg-clay-500' },
    { id: 'h3', name: 'Milla', initials: 'M', role: 'Child', colour: 'bg-honey-500' },
    { id: 'h4', name: 'Theo', initials: 'T', role: 'Child', colour: 'bg-moss-400' },
    { id: 'h5', name: 'Ivy', initials: 'I', role: 'Child', colour: 'bg-berry-500' },
  ],
  settings: {
    householdName: 'The Ashfords',
    shopLabel: 'New World Thursday',
    currency: 'NZD',
    weeklyBudget: null,
    pinDemoDate: false,
    pinnedDate: toIsoDate(new Date()),
    showBreakfastAndLunch: false,
  },
};
