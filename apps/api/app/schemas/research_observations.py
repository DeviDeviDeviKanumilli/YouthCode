from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.sampling_grid import SamplingLabel
from app.models.signal_score import SignalScoreLabel
from app.models.verification import VerificationStatus


class ResearchObservationLocation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    latitude: str
    longitude: str
    region_code: str | None = None
    privacy_level: str


class ResearchObservationListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observation_id: UUID
    photo_thumbnail_url: str | None = None
    candidate_species: str | None = None
    confidence: str | None = None
    signal_score: str | None = None
    signal_label: SignalScoreLabel | None = None
    verification_status: VerificationStatus
    location_summary: ResearchObservationLocation
    submitted_at: datetime
    sampling_label: SamplingLabel | None = None
    needs_review: bool


class ResearchObservationPage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[ResearchObservationListItem]
    total: int = Field(ge=0)
    limit: int = Field(ge=1)
    offset: int = Field(ge=0)
    sort: Literal[
        "submitted_at_desc",
        "submitted_at_asc",
        "signal_score_desc",
        "signal_score_asc",
    ]
