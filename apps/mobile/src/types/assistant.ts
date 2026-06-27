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

export type RegionAssistantContext = {
  center: Record<string, string>;
  radius_km: string;
  nearby_signals: Record<string, unknown>[];
  watched_species: Record<string, unknown>[];
  sampling_gaps: Record<string, unknown>[];
  recent_high_priority_observations: Record<string, unknown>[];
  data_sparsity_warning: string;
  source_summaries: {
    observation_count?: number;
    sampling_grid_cell_count?: number;
    observation_sources?: Record<string, number>;
    [key: string]: unknown;
  };
  required_uncertainty_notice: string;
  data_sources_used: string[];
};

export type RegionAssistantSummary = {
  nearbySignalCount: number;
  watchedSpeciesCount: number;
  samplingGapCount: number;
  highPriorityCount: number;
  observationCount: number;
  samplingCellCount: number;
  dataSourceCount: number;
};
