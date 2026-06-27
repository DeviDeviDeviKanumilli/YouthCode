import { describe, expect, it } from 'vitest';
import { firstAllowedClaims, summarizeObservationAssistantContext } from './assistantContext';
import type { ObservationAssistantContext } from '@/types/assistant';

describe('assistant context helpers', () => {
  it('summarizes grounded observation context without inventing evidence', () => {
    const context: ObservationAssistantContext = {
      observation_id: 'obs-1',
      observation: {},
      media_metadata: [],
      latest_identification: 'unknown',
      environmental_context: { land_cover_class: 'urban' },
      signal_score: 'unknown',
      verification_status: 'raw',
      nearby_records_summary: 'unknown',
      sampling_gap_context: 'unknown',
      allowed_claims: ['insufficient evidence', 'needs verification', 'possible species candidate'],
      required_uncertainty_notice: 'This is not a confirmed identification.',
      data_sources_used: ['observations', 'environmental_context'],
    };

    expect(summarizeObservationAssistantContext(context)).toEqual({
      verificationStatus: 'raw',
      allowedClaimCount: 3,
      dataSourceCount: 2,
      hasIdentification: false,
      hasEnvironmentalContext: true,
      hasSignalScore: false,
    });
    expect(firstAllowedClaims(context, 2)).toEqual(['insufficient evidence', 'needs verification']);
  });
});
