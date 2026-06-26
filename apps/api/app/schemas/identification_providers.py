import uuid
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.identifications import AIIdentificationCreate


class IdentificationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_species_id: uuid.UUID | None = None
    candidate_scientific_name: str = Field(min_length=1, max_length=255)
    candidate_common_name: str | None = Field(default=None, max_length=255)
    confidence: Decimal = Field(ge=Decimal("0"), le=Decimal("1"))
    model_name: str = Field(min_length=1, max_length=120)
    model_version: str = Field(min_length=1, max_length=120)
    similar_species: list[dict[str, Any]] = Field(default_factory=list)
    raw_model_output: dict[str, Any] = Field(default_factory=dict)
    needs_verification: bool = True

    def to_identification_create(self) -> AIIdentificationCreate:
        return AIIdentificationCreate(
            candidate_species_id=self.candidate_species_id,
            candidate_scientific_name=self.candidate_scientific_name,
            candidate_common_name=self.candidate_common_name,
            confidence=self.confidence,
            model_name=self.model_name,
            model_version=self.model_version,
            similar_species=self.similar_species,
            raw_model_output=self.raw_model_output,
            needs_verification=self.needs_verification,
        )
