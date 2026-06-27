export type ObservationAssistantContext = {
  observation_id: string;
  observation: Record<string, unknown>;
  media_metadata: Record<string, unknown>[];
  latest_identification: Record<string, unknown> | string;
  environmental_context: Record<string, unknown> | string;
  signal_score: Record<string, unknown> | string;
  verification_status: string;
  nearby_records_summary: Record<string, unknown> | string;
  sampling_gap_context: Record<string, unknown> | string;
  allowed_claims: string[];
  required_uncertainty_notice: string;
  data_sources_used: string[];
};

export type AssistantContextSummary = {
  verificationStatus: string;
  allowedClaimCount: number;
  dataSourceCount: number;
  hasIdentification: boolean;
  hasEnvironmentalContext: boolean;
  hasSignalScore: boolean;
};
