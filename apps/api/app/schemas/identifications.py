import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.identification import ConfidenceLabel


class AIIdentificationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_species_id: uuid.UUID | None = None
    candidate_scientific_name: str = Field(min_length=1, max_length=255)
    candidate_common_name: str | None = Field(default=None, max_length=255)
    confidence: Decimal = Field(ge=Decimal("0"), le=Decimal("1"))
    confidence_label: ConfidenceLabel | None = None
    model_name: str = Field(min_length=1, max_length=120)
    model_version: str = Field(min_length=1, max_length=120)
    similar_species: list[dict[str, Any]] = Field(default_factory=list)
    raw_model_output: dict[str, Any] = Field(default_factory=dict)
    needs_verification: bool = True


class AIIdentificationRunCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    media_id: uuid.UUID
    provider_name: str = Field(default="mock", min_length=1, max_length=120)


class AIIdentificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    observation_id: uuid.UUID
    candidate_species_id: uuid.UUID | None
    candidate_scientific_name: str
    candidate_common_name: str | None
    confidence: Decimal
    confidence_label: ConfidenceLabel
    model_name: str
    model_version: str
    similar_species: list[dict[str, Any]]
    raw_model_output: dict[str, Any]
    needs_verification: bool
    created_at: datetime
