import type { AssistantContextSummary, ObservationAssistantContext } from '@/types/assistant';

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
