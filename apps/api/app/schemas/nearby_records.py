import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.static_geo_layers import NearbyKnownRecord


class NearbyRecordsSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observation_id: uuid.UUID
    species_id: uuid.UUID | None
    radius_km: Decimal
    record_count: int
    nearest_distance_m: Decimal | None
    sources: list[str]
    verified_count: int
    unverified_count: int
    records: list[NearbyKnownRecord]
