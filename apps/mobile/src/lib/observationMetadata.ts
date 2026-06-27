import type { ObservationRead } from '../types/report';

export function observationDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Submitted recently';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function coordinateUncertaintyLabel(value: ObservationRead['coordinate_uncertainty_m']) {
  if (value == null) {
    return 'Unknown precision';
  }

  const meters = Number(value);
  if (Number.isNaN(meters)) {
    return 'Unknown precision';
  }

  if (meters >= 1000) {
    return `Approx. ${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km precision`;
  }

  return `Approx. ${Math.round(meters)} m precision`;
}

export function habitatAnswerCount(observation: Pick<ObservationRead, 'habitat_answers'>) {
  return Object.values(observation.habitat_answers).filter((value) => value != null && value !== '')
    .length;
}

export function observationPrivacyLabel(level: ObservationRead['privacy_level']) {
  switch (level) {
    case 'public':
      return 'Public';
    case 'private':
      return 'Private';
    case 'obscured':
    default:
      return 'Obscured';
  }
}
