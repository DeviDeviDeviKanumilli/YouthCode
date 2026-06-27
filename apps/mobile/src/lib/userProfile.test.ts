import { describe, expect, it } from 'vitest';
import { userDisplayName, userPrivacySummary, userRoleLabel } from './userProfile';
import type { UserRead } from '../types/user';

const baseUser: UserRead = {
  id: 'user-1',
  display_name: 'Mobile Observer',
  role: 'consumer',
  trusted_reviewer_status: false,
  privacy_settings: { local_only: true },
  created_at: '2026-06-27T00:00:00Z',
  updated_at: '2026-06-27T00:00:00Z',
};

describe('user profile helpers', () => {
  it('summarizes backend user display fields', () => {
    expect(userDisplayName(baseUser)).toBe('Mobile Observer');
    expect(userRoleLabel(baseUser)).toBe('consumer');
    expect(userPrivacySummary(baseUser)).toBe('Local-only anonymous observer profile.');
  });

  it('shows location precision when provided by backend privacy settings', () => {
    expect(
      userPrivacySummary({
        privacy_settings: { location_precision: 'obscured' },
      })
    ).toBe('Location precision: obscured');
  });

  it('has safe loading fallbacks', () => {
    expect(userDisplayName(null)).toBe('Mobile Observer');
    expect(userRoleLabel(null)).toBe('Preparing');
    expect(userPrivacySummary(null)).toBe('Loading backend privacy settings.');
  });
});
