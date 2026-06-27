import { describe, expect, it } from 'vitest';
import {
  coordinateUncertaintyLabel,
  habitatAnswerCount,
  observationDateLabel,
  observationPrivacyLabel,
} from './observationMetadata';

describe('observation metadata helpers', () => {
  it('formats submitted date and coordinate uncertainty', () => {
    expect(observationDateLabel('2026-06-27T14:05:00Z')).toContain('Jun');
    expect(coordinateUncertaintyLabel('35')).toBe('Approx. 35 m precision');
    expect(coordinateUncertaintyLabel('5000')).toBe('Approx. 5.0 km precision');
  });

  it('counts non-empty habitat answers and labels privacy', () => {
    expect(habitatAnswerCount({ habitat_answers: { near_water: 'yes', empty: '', missing: null } })).toBe(1);
    expect(observationPrivacyLabel('obscured')).toBe('Obscured');
    expect(observationPrivacyLabel('private')).toBe('Private');
  });
});
