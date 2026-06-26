import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.signal_score import SignalScoreLabel


class SignalScoreCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    identity_confidence: Decimal = Field(ge=Decimal("0"), le=Decimal("100"))
    local_novelty: Decimal = Field(ge=Decimal("0"), le=Decimal("100"))
    habitat_match: Decimal = Field(ge=Decimal("0"), le=Decimal("100"))
    pathway_risk: Decimal = Field(ge=Decimal("0"), le=Decimal("100"))
    nearby_verified_record_context: Decimal = Field(ge=Decimal("0"), le=Decimal("100"))
    ecological_sensitivity: Decimal = Field(ge=Decimal("0"), le=Decimal("100"))
    sampling_gap_value: Decimal = Field(ge=Decimal("0"), le=Decimal("100"))
    temporal_cluster_score: Decimal = Field(ge=Decimal("0"), le=Decimal("100"))
    uncertainty_penalty: Decimal = Field(ge=Decimal("0"), le=Decimal("100"))
    final_signal_priority: Decimal = Field(ge=Decimal("0"), le=Decimal("100"))
    label: SignalScoreLabel
    reasons: list[dict[str, Any]] = Field(default_factory=list)
    model_version: str = Field(min_length=1, max_length=120)

    @field_validator("final_signal_priority")
    @classmethod
    def quantize_final_score(cls, value: Decimal) -> Decimal:
        return value.quantize(Decimal("0.01"))


class SignalScoreRead(SignalScoreCreate):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    observation_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
