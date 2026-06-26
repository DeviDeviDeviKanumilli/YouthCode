import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.observation import ObservationSource, PrivacyLevel


class ObservationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: uuid.UUID | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    latitude: Decimal = Field(ge=Decimal("-90"), le=Decimal("90"))
    longitude: Decimal = Field(ge=Decimal("-180"), le=Decimal("180"))
    coordinate_uncertainty_m: Decimal | None = Field(default=None, ge=Decimal("0"))
    region_code: str | None = Field(default=None, max_length=32)
    source: ObservationSource = ObservationSource.consumer_app
    raw_note: str | None = None
    habitat_answers: dict[str, Any] = Field(default_factory=dict)
    survey_session_id: uuid.UUID | None = None
    privacy_level: PrivacyLevel = PrivacyLevel.public

class ObservationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    timestamp: datetime | None = None
    latitude: Decimal | None = Field(default=None, ge=Decimal("-90"), le=Decimal("90"))
    longitude: Decimal | None = Field(default=None, ge=Decimal("-180"), le=Decimal("180"))
    coordinate_uncertainty_m: Decimal | None = Field(default=None, ge=Decimal("0"))
    region_code: str | None = Field(default=None, max_length=32)
    raw_note: str | None = None
    habitat_answers: dict[str, Any] | None = None
    privacy_level: PrivacyLevel | None = None


class ObservationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    user_id: uuid.UUID | None
    timestamp: datetime
    latitude: Decimal
    longitude: Decimal
    coordinate_uncertainty_m: Decimal | None
    region_code: str | None
    source: ObservationSource
    raw_note: str | None
    habitat_answers: dict[str, Any]
    survey_session_id: uuid.UUID | None
    privacy_level: PrivacyLevel
    created_at: datetime
    updated_at: datetime


class ObservationListItem(ObservationRead):
    pass


class ObservationCreateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observation_id: uuid.UUID
    status: str
    next_steps: list[str]
