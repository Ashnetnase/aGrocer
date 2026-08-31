import { describe, expect, it } from 'vitest';
import type { HouseholdMember } from '../schemas/household';
import { describeHousehold, initialsOf } from './household';

describe('initialsOf', () => {
  it('uses one letter for a single name', () => {
    expect(initialsOf('Ash')).toBe('A');
  });

  it('uses first and last for multiple names', () => {
    expect(initialsOf('Mary Jane Watson')).toBe('MW');
  });

  it('ignores extra whitespace and uppercases', () => {
    expect(initialsOf('  milla   rose  ')).toBe('MR');
  });

  it('falls back for an empty name', () => {
    expect(initialsOf('   ')).toBe('?');
  });
});

describe('describeHousehold', () => {
  const member = (role: HouseholdMember['role'], id: string): HouseholdMember => ({
    id,
    name: id,
    initials: 'X',
    role,
    colour: 'bg-moss-600',
    school: null,
  });

  it('describes adults and children', () => {
    expect(describeHousehold([member('Adult', '1'), member('Adult', '2'), member('Child', '3')])).toBe(
      '2 adults + 1 child',
    );
  });

  it('uses singular forms', () => {
    expect(describeHousehold([member('Adult', '1')])).toBe('1 adult');
  });

  it('handles an empty household', () => {
    expect(describeHousehold([])).toBe('No one yet');
  });
});
