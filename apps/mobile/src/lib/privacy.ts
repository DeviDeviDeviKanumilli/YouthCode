export type ObservationPrivacyLevel = 'public' | 'obscured' | 'private';

export const DEFAULT_OBSERVATION_PRIVACY: ObservationPrivacyLevel = 'obscured';

export function privacyTitle(level: ObservationPrivacyLevel) {
  switch (level) {
    case 'public':
      return 'Public location';
    case 'private':
      return 'Private location';
    case 'obscured':
    default:
      return 'Obscured location';
  }
}

export function privacyDescription(level: ObservationPrivacyLevel) {
  switch (level) {
    case 'public':
      return 'Exact coordinates may be visible in public map layers. Choose only if that is okay.';
    case 'private':
      return 'Coordinates stay out of public exports and are only used for backend context.';
    case 'obscured':
    default:
      return 'Recommended for most sightings: public maps use generalized coordinates.';
  }
}
