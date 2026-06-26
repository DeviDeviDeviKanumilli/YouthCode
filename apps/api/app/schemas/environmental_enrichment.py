import uuid
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.environmental_context import EnvironmentalContextCreate


class EnvironmentalContextResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observation_id: uuid.UUID
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
    data_sources: dict[str, Any]
    enrichment_version: str = Field(min_length=1, max_length=120)

    def to_context_create(self) -> EnvironmentalContextCreate:
        return EnvironmentalContextCreate(
            land_cover_class=self.land_cover_class,
            tree_canopy_pct=self.tree_canopy_pct,
            impervious_surface_pct=self.impervious_surface_pct,
            ndvi_value=self.ndvi_value,
            distance_to_water_m=self.distance_to_water_m,
            distance_to_road_m=self.distance_to_road_m,
            distance_to_trail_m=self.distance_to_trail_m,
            distance_to_park_m=self.distance_to_park_m,
            elevation_m=self.elevation_m,
            slope=self.slope,
            recent_precipitation=self.recent_precipitation,
            recent_temperature=self.recent_temperature,
            data_sources=self.data_sources,
            enrichment_version=self.enrichment_version,
        )
