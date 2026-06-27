import { describe, expect, it } from 'vitest';
import {
  firstAllowedClaims,
  summarizeObservationAssistantContext,
  summarizeRegionAssistantContext,
} from './assistantContext';
import type { ObservationAssistantContext, RegionAssistantContext } from '@/types/assistant';

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

  it('summarizes grounded region context for Explore', () => {
    const context: RegionAssistantContext = {
      center: { latitude: '40.714', longitude: '-74.006' },
      radius_km: '10',
      nearby_signals: [{ observation_id: 'obs-1' }],
      watched_species: [{ scientific_name: 'Fallopia japonica' }],
      sampling_gaps: [{ sampling_label: 'high_risk_under_sampled' }],
      recent_high_priority_observations: [{ observation_id: 'obs-1' }],
      data_sparsity_warning: 'Sparse data is not true absence.',
      source_summaries: {
        observation_count: 4,
        sampling_grid_cell_count: 2,
        observation_sources: { consumer_app: 4 },
      },
      required_uncertainty_notice: 'Do not claim true absence.',
      data_sources_used: ['observations', 'sampling_grid'],
    };

    expect(summarizeRegionAssistantContext(context)).toEqual({
      nearbySignalCount: 1,
      watchedSpeciesCount: 1,
      samplingGapCount: 1,
      highPriorityCount: 1,
      observationCount: 4,
      samplingCellCount: 2,
      dataSourceCount: 2,
    });
  });
});
