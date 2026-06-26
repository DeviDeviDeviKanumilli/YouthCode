import uuid
from typing import Any

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
