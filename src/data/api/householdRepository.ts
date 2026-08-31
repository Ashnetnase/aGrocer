import type {
  Household,
  HouseholdMember,
  HouseholdMemberDraft,
  Settings,
} from '@/domain/schemas/household';
import type { HouseholdRepository } from '@/data/repositories/types';
import { patch, request } from './client';

/**
 * The household over HTTP (ADR-003).
 *
 * Members live under `/api/household/members`, but `get()` still returns them alongside the
 * settings, because that is what the contract promises and what both screens consume.
 */

const BASE = '/api/household';

export const apiHouseholdRepository: HouseholdRepository = {
  async get() {
    const { household } = await request<{ household: Household }>(BASE);
    return household;
  },

  async addMember(draft: HouseholdMemberDraft) {
    const { member } = await request<{ member: HouseholdMember }>(`${BASE}/members`, {
      method: 'POST',
      body: JSON.stringify(draft),
    });
    return member;
  },

  async updateMember(id: string, draft: HouseholdMemberDraft) {
    const response = await fetch(`${BASE}/members/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(draft),
    });

    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`PUT ${BASE}/members/${id} failed (${response.status})`);

    const { member } = (await response.json()) as { member: HouseholdMember };
    return member;
  },

  async removeMember(id: string) {
    await request<void>(`${BASE}/members/${id}`, { method: 'DELETE' });
  },

  async updateSettings(settingsPatch: Partial<Settings>) {
    // Settings always exist, so unlike the item repositories there is no 404 case: a missing
    // household is a real failure, and the handler surfaces it as a 500.
    const settings = await patch<Settings>(BASE, settingsPatch, 'settings');
    if (!settings) throw new Error('PATCH /api/household returned no settings');
    return settings;
  },
};
