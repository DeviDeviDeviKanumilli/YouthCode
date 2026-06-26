import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.static_geo_layer import RoadTrailType
from app.models.verification import VerificationStatus


class LayerDistance(BaseModel):
    model_config = ConfigDict(extra="forbid")

    layer_id: uuid.UUID
    name: str | None
    source: str
    distance_m: Decimal


class RoadTrailDistance(LayerDistance):
    type: RoadTrailType


class NearbyKnownRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    species_id: uuid.UUID
    observed_at: datetime
    verification_status: VerificationStatus
    source: str
    distance_m: Decimal
