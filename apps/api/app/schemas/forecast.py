from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class GeoJSONFeature(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["Feature"] = "Feature"
    geometry: dict[str, Any]
    properties: dict[str, Any] = Field(default_factory=dict)


class GeoJSONFeatureCollection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[GeoJSONFeature]
    metadata: dict[str, Any] = Field(default_factory=dict)
