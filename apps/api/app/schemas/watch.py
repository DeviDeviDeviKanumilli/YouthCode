import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


WATCH_MODEL_CONFIG = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
    extra="forbid",
)


class WatchAction(BaseModel):
    model_config = WATCH_MODEL_CONFIG

    label: str
    type: str


class WatchRegion(BaseModel):
    model_config = WATCH_MODEL_CONFIG

    label: str
    radius_km: float


class WatchEvidence(BaseModel):
    model_config = WATCH_MODEL_CONFIG

    recent_observation_count: int | None = None
    nearest_observation_meters: int | None = None
    nearby_known_record_count: int | None = None
    current_month_relevant: bool | None = None
    habitat_matches: list[str] | None = None
    source_names: list[str] = Field(default_factory=list)


class WatchMapOverlay(BaseModel):
    model_config = WATCH_MODEL_CONFIG

    type: Literal["corridor", "area", "point", "boundary", "records", "habitat"]
    geometry_geo_json: dict[str, Any] | None = None
    points_geo_json: dict[str, Any] | None = None


class WatchLocationContext(BaseModel):
    model_config = WATCH_MODEL_CONFIG

    center_lat: float | None = None
    center_lon: float | None = None
    radius_meters: int | None = None
    geometry_geo_json: dict[str, Any] | None = None


class GoodPlaceEvidence(BaseModel):
    model_config = WATCH_MODEL_CONFIG

    nearest_feature_meters: int | None = None
    sampling_label: str | None = None
    relevant_species_ids: list[str] | None = None
    source_names: list[str] = Field(default_factory=list)


class WatchItem(BaseModel):
    model_config = WATCH_MODEL_CONFIG

    id: str
    type: Literal[
        "species_watch",
        "seasonal_watch",
        "habitat_watch",
        "tree_health",
        "aquatic_watch",
    ]
    label: str
    title: str
    summary: str
    chips: list[str]
    species_id: uuid.UUID | None = None
    priority: int
    confidence_label: Literal["low", "medium", "high"]
    evidence: WatchEvidence
    image_url: str | None = None
    image_alt: str | None = None
    next_action: WatchAction


class GoodPlaceToCheck(BaseModel):
    model_config = WATCH_MODEL_CONFIG

    id: str
    type: Literal[
        "creek_edges",
        "trail_entrances",
        "park_boundaries",
        "street_trees",
        "wetland_edges",
        "garden_edges",
    ]
    title: str
    summary: str
    chips: list[str]
    priority: int
    image_url: str | None = None
    image_alt: str | None = None
    location_context: WatchLocationContext
    map_overlay: WatchMapOverlay | None = None
    evidence: GoodPlaceEvidence
    next_action: WatchAction


class WatchEmptyState(BaseModel):
    model_config = WATCH_MODEL_CONFIG

    title: str
    message: str
    action_label: str | None = None


class WatchScreenResponse(BaseModel):
    model_config = WATCH_MODEL_CONFIG

    region: WatchRegion
    updated_at: datetime
    watched_near_you: list[WatchItem]
    good_places_to_check: list[GoodPlaceToCheck]
    empty_state: WatchEmptyState | None = None


class WatchItemLocalContext(BaseModel):
    model_config = WATCH_MODEL_CONFIG

    summary: str
    recent_observation_count: int | None = None
    nearest_observation_meters: int | None = None
    confidence_label: Literal["low", "medium", "high"]


class WatchItemDetail(BaseModel):
    model_config = WATCH_MODEL_CONFIG

    id: str
    title: str
    label: str
    species_id: uuid.UUID | None = None
    image_url: str | None = None
    explanation: str
    what_to_look_for: list[str]
    where_to_look: list[str]
    photo_tips: list[str]
    lookalike_notes: list[str]
    local_context: WatchItemLocalContext
    uncertainty_notice: str
    map_overlay: WatchMapOverlay | None = None
    actions: list[WatchAction]


class GoodPlaceDetail(BaseModel):
    model_config = WATCH_MODEL_CONFIG

    id: str
    type: str
    title: str
    summary: str
    why_it_matters: str
    what_to_look_for: list[str]
    useful_photo_tips: list[str]
    relevant_watch_items: list[WatchItem]
    uncertainty_notice: str
    map_overlay: WatchMapOverlay
    actions: list[WatchAction]
