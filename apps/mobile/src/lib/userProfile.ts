import type { UserRead } from '../types/user';

export function userDisplayName(user: UserRead | null) {
  return user?.display_name || 'Mobile Observer';
}

export function userRoleLabel(user: Pick<UserRead, 'role'> | null) {
  if (!user) {
    return 'Preparing';
  }
  return user.role.replaceAll('_', ' ');
}

export function userPrivacySummary(user: Pick<UserRead, 'privacy_settings'> | null) {
  if (!user) {
    return 'Loading backend privacy settings.';
  }

  const precision = user.privacy_settings.location_precision;
  if (typeof precision === 'string') {
    return `Location precision: ${precision.replaceAll('_', ' ')}`;
  }

  if (user.privacy_settings.local_only === true) {
    return 'Local-only anonymous observer profile.';
  }

  return 'Backend privacy settings available.';
}
