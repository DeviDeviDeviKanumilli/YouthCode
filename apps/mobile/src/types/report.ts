export type ObservationCreatePayload = {
  user_id?: string | null;
  latitude: number;
  longitude: number;
  coordinate_uncertainty_m?: number | null;
  timestamp?: string;
  region_code?: string | null;
  raw_note?: string | null;
  habitat_answers?: Record<string, unknown>;
  privacy_level?: 'public' | 'obscured' | 'private';
};

export type ObservationCreateResponse = {
  observation_id: string;
  status: string;
  next_steps: string[];
};

export type MediaCreatePayload = {
  file_type: 'image';
  mime_type: string;
  storage_key: string;
  public_url?: string | null;
  original_filename?: string | null;
  size_bytes?: number | null;
  quality_score?: number | null;
  metadata_removed?: boolean;
};

export type MediaRead = {
  id: string;
  observation_id: string;
  file_type: string;
  mime_type: string;
  storage_key: string;
  public_url?: string | null;
};

export type IdentificationRequest = {
  media_id: string;
  provider_name?: string;
};

export type IdentificationResponse = {
  id: string;
  observation_id: string;
  candidate_species_id?: string | null;
  candidate_scientific_name: string;
  candidate_common_name?: string | null;
  confidence: number;
  confidence_label: string;
  needs_verification: boolean;
};

export type SightingIntelligenceCard = {
  observation_id: string;
  possible_species?: {
    common_name?: string | null;
    scientific_name?: string | null;
  } | null;
  confidence?: number | null;
  confidence_label?: string | null;
  similar_species_warning?: string | null;
  local_status: string;
  known_nearby_records_summary: string;
  habitat_match_summary: string;
  pathway_summary: string;
  sampling_value_summary: string;
  verification_status: string;
  signal_priority?: number | null;
  signal_label?: string | null;
  plain_language_explanation: string;
  uncertainty_notice: string;
  data_sources_used: string[];
};

export type ObservationRead = {
  id: string;
  user_id?: string | null;
  timestamp: string;
  latitude: number | string;
  longitude: number | string;
  coordinate_uncertainty_m?: number | string | null;
  region_code?: string | null;
  source: string;
  raw_note?: string | null;
  habitat_answers: Record<string, unknown>;
  survey_session_id?: string | null;
  privacy_level: 'public' | 'obscured' | 'private';
  created_at: string;
  updated_at: string;
};

export type ObservationPipelineStatus = {
  observation_id: string;
  current_status: string;
  completed_steps: string[];
  failed_steps: Array<{
    step: string;
    message?: string | null;
  }>;
  next_available_user_action: string;
};
