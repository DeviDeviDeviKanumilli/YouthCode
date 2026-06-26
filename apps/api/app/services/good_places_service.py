from decimal import Decimal
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sampling_grid import SamplingLabel
from app.models.static_geo_layer import RoadTrailType
from app.models.watch import WatchAssetImage
from app.schemas.watch import (
    GoodPlaceEvidence,
    GoodPlaceToCheck,
    WatchAction,
    WatchLocationContext,
    WatchMapOverlay,
)
from app.services.local_context_service import LocalWatchContext
from app.services.species_profile_service import SpeciesProfileService, SpeciesWatchProfileBundle
from app.services.watch_copy_service import WatchCopyService
from app.services.watch_ids import decimal_string, encode_watch_id
from app.services.watch_ranking_service import WatchRankingService


class GoodPlacesService:
    def __init__(self, session: AsyncSession) -> None:
        self.profile_assets = SpeciesProfileService(session)
        self.copy = WatchCopyService()
        self.ranking = WatchRankingService()

    async def generate(
        self,
        *,
        context: LocalWatchContext,
        profiles: list[SpeciesWatchProfileBundle],
        include_fallback: bool = False,
    ) -> list[GoodPlaceToCheck]:
        place_assets = await self.profile_assets.place_assets()
        places: list[GoodPlaceToCheck] = []
        if context.waterways:
            places.append(
                self._place(
                    context,
                    place_type="creek_edges",
                    title="Creek edges",
                    chips=["Near water", *self._sampling_chips(context)],
                    priority=72 + self._sampling_boost(context),
                    nearest_feature_m=self._nearest_static_m(context, "waterway"),
                    relevant_species_ids=self._relevant_species_ids(profiles, {"water", "creek"}),
                    overlay_type="corridor",
                    asset=place_assets.get("creek_edges"),
                )
            )
        if any(layer.type == RoadTrailType.trail for layer in context.roads_trails):
            places.append(
                self._place(
                    context,
                    place_type="trail_entrances",
                    title="Trail entrances",
                    chips=["Trail edges", *self._sampling_chips(context)],
                    priority=66 + self._sampling_boost(context),
                    nearest_feature_m=self._nearest_static_m(context, "trail"),
                    relevant_species_ids=self._relevant_species_ids(profiles, {"trail", "edge"}),
                    overlay_type="corridor",
                    asset=place_assets.get("trail_entrances"),
                )
            )
        if context.parks:
            places.append(
                self._place(
                    context,
                    place_type="park_boundaries",
                    title="Park boundaries",
                    chips=["Park edge", *self._sampling_chips(context)],
                    priority=62 + self._sampling_boost(context),
                    nearest_feature_m=self._nearest_static_m(context, "park"),
                    relevant_species_ids=self._relevant_species_ids(profiles, {"park", "edge"}),
                    overlay_type="boundary",
                    asset=place_assets.get("park_boundaries"),
                )
            )
        tree_pest_profiles = [bundle for bundle in profiles if bundle.profile.is_tree_pest]
        if tree_pest_profiles and context.roads_trails:
            places.append(
                self._place(
                    context,
                    place_type="street_trees",
                    title="Street trees",
                    chips=["Tree health", "Easy to photograph"],
                    priority=64,
                    nearest_feature_m=self._nearest_static_m(context, "road"),
                    relevant_species_ids=[str(bundle.species.id) for bundle in tree_pest_profiles],
                    overlay_type="point",
                    asset=place_assets.get("street_trees"),
                )
            )
        if include_fallback and not places:
            places.append(
                self._place(
                    context,
                    place_type="park_boundaries",
                    title="Park edges",
                    chips=["Good starting point"],
                    priority=50,
                    nearest_feature_m=None,
                    relevant_species_ids=[],
                    overlay_type="area",
                    asset=place_assets.get("park_boundaries"),
                )
            )
        return self.ranking.rank_good_places(places)

    def _place(
        self,
        context: LocalWatchContext,
        *,
        place_type: Literal[
            "creek_edges",
            "trail_entrances",
            "park_boundaries",
            "street_trees",
            "wetland_edges",
            "garden_edges",
        ],
        title: str,
        chips: list[str],
        priority: int,
        nearest_feature_m: int | None,
        relevant_species_ids: list[str],
        overlay_type: Literal["corridor", "area", "point", "boundary", "records", "habitat"],
        asset: WatchAssetImage | None,
    ) -> GoodPlaceToCheck:
        return GoodPlaceToCheck(
            id=encode_watch_id(
                {
                    "kind": "place",
                    "key": place_type,
                    "lat": decimal_string(context.latitude),
                    "lon": decimal_string(context.longitude),
                    "radius": decimal_string(context.radius_km),
                }
            ),
            type=place_type,
            title=title,
            summary=self.copy.place_summary(place_type),
            chips=chips[:4],
            priority=priority,
            image_url=asset.image_url if asset else None,
            image_alt=asset.alt_text if asset else None,
            location_context=WatchLocationContext(
                center_lat=float(context.latitude),
                center_lon=float(context.longitude),
                radius_meters=int(context.radius_m),
                geometry_geo_json=self._area_geometry(context),
            ),
            map_overlay=WatchMapOverlay(
                type=overlay_type,
                geometry_geo_json=self._area_geometry(context),
            ),
            evidence=GoodPlaceEvidence(
                nearest_feature_meters=nearest_feature_m,
                sampling_label=self._sampling_label(context),
                relevant_species_ids=relevant_species_ids,
                source_names=["static_geo_layers", "sampling_grid_cells"],
            ),
            next_action=WatchAction(
                label="Report near here",
                type="start_report_with_place_context",
            ),
        )

    def _sampling_boost(self, context: LocalWatchContext) -> int:
        return 12 if self._sampling_label(context) in {
            "under_sampled",
            "high_risk_under_sampled",
            "needs_structured_survey",
            "likely_false_absence",
        } else 0

    def _sampling_chips(self, context: LocalWatchContext) -> list[str]:
        return ["Under-sampled"] if self._sampling_boost(context) > 0 else []

    def _sampling_label(self, context: LocalWatchContext) -> str | None:
        if not context.sampling_cells:
            return None
        priority_labels = [
            SamplingLabel.needs_structured_survey,
            SamplingLabel.high_risk_under_sampled,
            SamplingLabel.under_sampled,
            SamplingLabel.likely_false_absence,
        ]
        for label in priority_labels:
            if any(cell.sampling_label == label for cell in context.sampling_cells):
                return label.value
        return context.sampling_cells[0].sampling_label.value

    def _nearest_static_m(self, context: LocalWatchContext, layer: str) -> int | None:
        candidates: list[tuple[Decimal, Decimal]] = []
        if layer == "waterway":
            candidates = [
                (item.representative_latitude, item.representative_longitude)
                for item in context.waterways
            ]
        elif layer == "park":
            candidates = [
                (item.representative_latitude, item.representative_longitude)
                for item in context.parks
            ]
        elif layer in {"trail", "road"}:
            expected = RoadTrailType.trail if layer == "trail" else RoadTrailType.road
            candidates = [
                (item.representative_latitude, item.representative_longitude)
                for item in context.roads_trails
                if item.type == expected
            ]
        if not candidates:
            return None
        nearest = min(
            self._distance_m(context.latitude, context.longitude, lat, lon)
            for lat, lon in candidates
        )
        return int(nearest)

    def _relevant_species_ids(
        self,
        profiles: list[SpeciesWatchProfileBundle],
        tags: set[str],
    ) -> list[str]:
        return [
            str(bundle.species.id)
            for bundle in profiles
            if tags.intersection(bundle.profile.habitat_tags + bundle.profile.pathway_tags)
        ][:5]

    def _area_geometry(self, context: LocalWatchContext) -> dict[str, object]:
        min_lon, min_lat, max_lon, max_lat = context.bbox
        return {
            "type": "Polygon",
            "coordinates": [
                [
                    [float(min_lon), float(min_lat)],
                    [float(max_lon), float(min_lat)],
                    [float(max_lon), float(max_lat)],
                    [float(min_lon), float(max_lat)],
                    [float(min_lon), float(min_lat)],
                ]
            ],
        }

    def _distance_m(
        self,
        lat_a: Decimal,
        lon_a: Decimal,
        lat_b: Decimal,
        lon_b: Decimal,
    ) -> Decimal:
        from app.repositories.static_geo_layers import StaticGeoLayerRepository

        return StaticGeoLayerRepository.distance_m(
            StaticGeoLayerRepository.__new__(StaticGeoLayerRepository),
            lat_a,
            lon_a,
            lat_b,
            lon_b,
        )
