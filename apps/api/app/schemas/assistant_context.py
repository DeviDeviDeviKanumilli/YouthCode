import uuid
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ObservationAssistantContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observation_id: uuid.UUID
    observation: dict[str, Any]
    media_metadata: list[dict[str, Any]] = Field(default_factory=list)
    latest_identification: dict[str, Any] | str
    environmental_context: dict[str, Any] | str
    signal_score: dict[str, Any] | str
    verification_status: str
    nearby_records_summary: dict[str, Any] | str
    sampling_gap_context: dict[str, Any] | str
    allowed_claims: list[str]
    required_uncertainty_notice: str
    data_sources_used: list[str]


class RegionAssistantContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    center: dict[str, str]
    radius_km: str
    nearby_signals: list[dict[str, Any]] = Field(default_factory=list)
    watched_species: list[dict[str, Any]] = Field(default_factory=list)
    sampling_gaps: list[dict[str, Any]] = Field(default_factory=list)
    recent_high_priority_observations: list[dict[str, Any]] = Field(default_factory=list)
    data_sparsity_warning: str
    source_summaries: dict[str, Any]
    required_uncertainty_notice: str
    data_sources_used: list[str]


ResearchQuestionType = Literal[
    "verification_priority",
    "range_edge",
    "under_sampled_areas",
    "export_summary",
    "watershed_summary",
    "species_summary",
]


class ResearchAssistantContextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    requester_id: uuid.UUID
    question_type: ResearchQuestionType
    filters: dict[str, Any] = Field(default_factory=dict)


class ResearchAssistantContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_type: ResearchQuestionType
    filtered_observation_summary: dict[str, Any]
    top_records: list[dict[str, Any]] = Field(default_factory=list)
    sampling_concerns: list[dict[str, Any]] = Field(default_factory=list)
    exportable_query_filters: dict[str, Any]
    uncertainty_notes: list[str]
    data_sources_used: list[str]
