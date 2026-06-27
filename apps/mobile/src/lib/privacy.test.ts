import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OBSERVATION_PRIVACY,
  privacyDescription,
  privacyTitle,
} from './privacy';

describe('privacy helpers', () => {
  it('defaults normal consumer sightings to obscured location sharing', () => {
    expect(DEFAULT_OBSERVATION_PRIVACY).toBe('obscured');
    expect(privacyTitle(DEFAULT_OBSERVATION_PRIVACY)).toBe('Obscured location');
    expect(privacyDescription(DEFAULT_OBSERVATION_PRIVACY)).toContain('Recommended');
  });

  it('warns before public coordinate sharing', () => {
    expect(privacyDescription('public')).toContain('Exact coordinates');
  });

  it('describes private coordinates as excluded from public exports', () => {
    expect(privacyDescription('private')).toContain('public exports');
  });
});
