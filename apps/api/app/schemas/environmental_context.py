import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EnvironmentalContextCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    land_cover_class: str | None = Field(default=None, max_length=120)
    tree_canopy_pct: Decimal | None = Field(default=None, ge=Decimal("0"), le=Decimal("100"))
    impervious_surface_pct: Decimal | None = Field(default=None, ge=Decimal("0"), le=Decimal("100"))
    ndvi_value: Decimal | None = Field(default=None, ge=Decimal("-1"), le=Decimal("1"))
    distance_to_water_m: Decimal | None = Field(default=None, ge=Decimal("0"))
    distance_to_road_m: Decimal | None = Field(default=None, ge=Decimal("0"))
    distance_to_trail_m: Decimal | None = Field(default=None, ge=Decimal("0"))
    distance_to_park_m: Decimal | None = Field(default=None, ge=Decimal("0"))
    elevation_m: Decimal | None = None
    slope: Decimal | None = None
    recent_precipitation: Decimal | None = None
    recent_temperature: Decimal | None = None
    data_sources: dict[str, Any] = Field(default_factory=dict)
    enrichment_version: str = Field(min_length=1, max_length=120)


class EnvironmentalContextRead(EnvironmentalContextCreate):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    observation_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
