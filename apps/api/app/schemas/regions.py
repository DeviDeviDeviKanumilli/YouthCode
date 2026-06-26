import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class RegionMapPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observation_id: uuid.UUID
    latitude: Decimal
    longitude: Decimal
    possible_species: str | None
    signal_label: str | None
    verification_status: str
    observed_at: datetime


class NearbySignalSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observation_id: uuid.UUID
    signal_label: str | None
    possible_species: str | None
    verification_status: str


class NearbyRegionSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    center_latitude: Decimal
    center_longitude: Decimal
    radius_km: Decimal
    region_summary: str
    nearby_signals: list[NearbySignalSummary]
    watched_species: list[str]
    under_sampled_note: str
    recent_observations: list[RegionMapPoint]
    simple_map_points: list[RegionMapPoint]
    uncertainty_notice: str
