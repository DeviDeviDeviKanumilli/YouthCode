import type {
  AssistantContextSummary,
  ObservationAssistantContext,
  RegionAssistantContext,
  RegionAssistantSummary,
} from '@/types/assistant';

export function summarizeObservationAssistantContext(
  context: ObservationAssistantContext
): AssistantContextSummary {
  return {
    verificationStatus: context.verification_status,
    allowedClaimCount: context.allowed_claims.length,
    dataSourceCount: context.data_sources_used.length,
    hasIdentification: context.latest_identification !== 'unknown',
    hasEnvironmentalContext: context.environmental_context !== 'unknown',
    hasSignalScore: context.signal_score !== 'unknown',
  };
}

export function firstAllowedClaims(context: ObservationAssistantContext, limit = 3) {
  return context.allowed_claims.slice(0, limit);
}

export function summarizeRegionAssistantContext(
  context: RegionAssistantContext
): RegionAssistantSummary {
  return {
    nearbySignalCount: context.nearby_signals.length,
    watchedSpeciesCount: context.watched_species.length,
    samplingGapCount: context.sampling_gaps.length,
    highPriorityCount: context.recent_high_priority_observations.length,
    observationCount: context.source_summaries.observation_count ?? 0,
    samplingCellCount: context.source_summaries.sampling_grid_cell_count ?? 0,
    dataSourceCount: context.data_sources_used.length,
  };
}
