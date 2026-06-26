import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.verification import VerificationStatus


class VerificationAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: VerificationStatus
    reviewer_id: uuid.UUID
    verified_species_id: uuid.UUID | None = None
    review_notes: str | None = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def validate_status_requirements(self) -> "VerificationAction":
        if self.status == VerificationStatus.rejected and not self.review_notes:
            raise ValueError("Rejected observations require review_notes.")
        if self.status in {
            VerificationStatus.expert_verified,
            VerificationStatus.field_confirmed,
        } and self.verified_species_id is None:
            raise ValueError("Verified observations require verified_species_id.")
        return self


class VerificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    observation_id: uuid.UUID
    status: VerificationStatus
    reviewer_id: uuid.UUID | None
    reviewer_type: str | None
    review_notes: str | None
    verified_species_id: uuid.UUID | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class VerificationEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    observation_id: uuid.UUID
    previous_status: VerificationStatus
    new_status: VerificationStatus
    reviewer_id: uuid.UUID
    notes: str | None
    created_at: datetime


class VerificationQueueItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observation_id: uuid.UUID
    verification_status: VerificationStatus
    observation: dict[str, Any]
    media: list[dict[str, Any]] = Field(default_factory=list)
    latest_identification: dict[str, Any] | None = None
    environmental_context: dict[str, Any] | None = None
    signal_score: dict[str, Any] | None = None
    nearby_records: dict[str, Any] | None = None
    signal_label: str | None = None
    final_signal_priority: str | None = None
    submitted_at: datetime
