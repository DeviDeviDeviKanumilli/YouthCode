from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.watch import WatchResponseCache
from app.schemas.watch import (
    GoodPlaceDetail,
    WatchAction,
    WatchEmptyState,
    WatchItemDetail,
    WatchItemLocalContext,
    WatchMapOverlay,
    WatchRegion,
    WatchScreenResponse,
)
from app.services.good_places_service import GoodPlacesService
from app.services.local_context_service import LocalContextService, LocalWatchContext
from app.services.species_profile_service import SpeciesProfileService
from app.services.watch_copy_service import WatchCopyService
from app.services.watch_ids import bucket_decimal, decimal_string, decode_watch_id
from app.services.watched_species_service import WatchedSpeciesService

WATCH_CACHE_SCHEMA_VERSION = "v1"
WATCH_CACHE_TTL = timedelta(hours=2)


class WatchService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.local_context = LocalContextService(session)
        self.profiles = SpeciesProfileService(session)
        self.watched_species = WatchedSpeciesService(session)
        self.good_places = GoodPlacesService(session)
        self.copy = WatchCopyService()

    async def watch_screen(
        self,
        *,
        latitude: Decimal,
        longitude: Decimal,
        radius_km: Decimal,
    ) -> WatchScreenResponse:
        lat_bucket = bucket_decimal(latitude)
        lon_bucket = bucket_decimal(longitude)
        cache_key = self._cache_key(lat_bucket, lon_bucket, radius_km)
        now = datetime.now(UTC)
        cached = await self._cached_response(cache_key, now)
        if cached is not None:
            return cached
        response = await self._build_screen(
            latitude=lat_bucket,
            longitude=lon_bucket,
            radius_km=radius_km,
            now=now,
        )
        await self._store_cache(
            cache_key=cache_key,
            lat_bucket=lat_bucket,
            lon_bucket=lon_bucket,
            radius_km=radius_km,
            response=response,
            now=now,
        )
        return response

    async def item_detail(self, watch_item_id: str) -> WatchItemDetail:
        payload = decode_watch_id(watch_item_id)
        if payload is None or payload["kind"] != "item":
            raise AppError(
                code="watch_item_not_found",
                message="Watch item was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        bundle = await self.profiles.get_profile_by_key(payload["key"])
        if bundle is None:
            raise AppError(
                code="watch_item_not_found",
                message="Watch item was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        context = await self.local_context.build(
            latitude=Decimal(payload["lat"]),
            longitude=Decimal(payload["lon"]),
            radius_km=Decimal(payload["radius"]),
        )
        items = await self.watched_species.generate(context=context, profiles=[bundle])
        item = items[0] if items else None
        evidence = item.evidence if item else None
        return WatchItemDetail(
            id=watch_item_id,
            title=bundle.species.common_name or bundle.species.scientific_name,
            label=bundle.profile.watch_label,
            species_id=bundle.species.id,
            image_url=bundle.asset.image_url if bundle.asset else None,
            explanation=self.copy.ensure_safe(bundle.profile.public_summary),
            what_to_look_for=bundle.profile.visual_clues,
            where_to_look=bundle.profile.habitat_tags + bundle.profile.pathway_tags,
            photo_tips=bundle.profile.photo_tips,
            lookalike_notes=bundle.profile.lookalike_notes,
            local_context=WatchItemLocalContext(
                summary=self._local_summary(context),
                recent_observation_count=(
                    evidence.recent_observation_count if evidence else None
                ),
                nearest_observation_meters=(
                    evidence.nearest_observation_meters if evidence else None
                ),
                confidence_label=item.confidence_label if item else "low",
            ),
            uncertainty_notice=self.copy.uncertainty_notice(),
            map_overlay=WatchMapOverlay(
                type="records",
                points_geo_json=self._observation_points(context),
            ),
            actions=[
                WatchAction(label="Report if you see this", type="start_report_with_species"),
                WatchAction(label="View nearby signals", type="view_nearby_signals"),
            ],
        )

    async def place_detail(self, place_id: str) -> GoodPlaceDetail:
        payload = decode_watch_id(place_id)
        if payload is None or payload["kind"] != "place":
            raise AppError(
                code="watch_place_not_found",
                message="Watch place was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        context = await self.local_context.build(
            latitude=Decimal(payload["lat"]),
            longitude=Decimal(payload["lon"]),
            radius_km=Decimal(payload["radius"]),
        )
        profiles = await self.profiles.list_profiles()
        places = await self.good_places.generate(context=context, profiles=profiles)
        place = next((candidate for candidate in places if candidate.type == payload["key"]), None)
        if place is None:
            raise AppError(
                code="watch_place_not_found",
                message="Watch place was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        relevant_items = await self.watched_species.generate(context=context, profiles=profiles)
        return GoodPlaceDetail(
            id=place.id,
            type=place.type,
            title=place.title,
            summary=place.summary,
            why_it_matters=self.copy.ensure_safe(
                "This place type can add useful local observations without implying presence."
            ),
            what_to_look_for=[
                "Plants, insects, tree health signs, or aquatic plants",
                "Clear visual details that reviewers can compare",
            ],
            useful_photo_tips=[
                "Take a wide habitat photo.",
                "Take a close photo of leaves, bark, insects, or flowers.",
                "Stay on public paths and avoid restricted areas.",
            ],
            relevant_watch_items=relevant_items[:3],
            uncertainty_notice=self.copy.uncertainty_notice(),
            map_overlay=place.map_overlay
            or WatchMapOverlay(type="area", geometry_geo_json=self._area_geometry(context)),
            actions=[WatchAction(label="Report near here", type="start_report_with_place_context")],
        )

    async def _build_screen(
        self,
        *,
        latitude: Decimal,
        longitude: Decimal,
        radius_km: Decimal,
        now: datetime,
    ) -> WatchScreenResponse:
        context = await self.local_context.build(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            now=now,
        )
        profiles = await self.profiles.list_profiles()
        watched = await self.watched_species.generate(context=context, profiles=profiles, now=now)
        empty_state = None
        if not watched:
            empty_state = WatchEmptyState(
                title="Local watch data is still building",
                message=(
                    "You can still report sightings. Clear photos help improve the local picture."
                ),
                action_label="Report a sighting",
            )
        places = await self.good_places.generate(
            context=context,
            profiles=profiles,
            include_fallback=not watched,
        )
        return WatchScreenResponse(
            region=WatchRegion(label=context.region_label, radius_km=float(radius_km)),
            updated_at=now,
            watched_near_you=watched,
            good_places_to_check=places,
            empty_state=empty_state,
        )

    async def _cached_response(
        self,
        cache_key: str,
        now: datetime,
    ) -> WatchScreenResponse | None:
        result = await self.session.execute(
            select(WatchResponseCache).where(WatchResponseCache.cache_key == cache_key)
        )
        cached = result.scalar_one_or_none()
        if cached is None:
            return None
        expires_at = cached.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at <= now:
            await self.session.execute(
                delete(WatchResponseCache).where(WatchResponseCache.cache_key == cache_key)
            )
            await self.session.commit()
            return None
        return WatchScreenResponse.model_validate(cached.response_json)

    async def _store_cache(
        self,
        *,
        cache_key: str,
        lat_bucket: Decimal,
        lon_bucket: Decimal,
        radius_km: Decimal,
        response: WatchScreenResponse,
        now: datetime,
    ) -> None:
        await self.session.execute(
            delete(WatchResponseCache).where(WatchResponseCache.cache_key == cache_key)
        )
        self.session.add(
            WatchResponseCache(
                cache_key=cache_key,
                lat_bucket=lat_bucket,
                lon_bucket=lon_bucket,
                radius_km=radius_km,
                response_json=response.model_dump(mode="json", by_alias=True),
                created_at=now,
                expires_at=now + WATCH_CACHE_TTL,
            )
        )
        await self.session.commit()

    def _cache_key(self, latitude: Decimal, longitude: Decimal, radius_km: Decimal) -> str:
        return (
            f"{WATCH_CACHE_SCHEMA_VERSION}:"
            f"{decimal_string(latitude)}:{decimal_string(longitude)}:{decimal_string(radius_km)}"
        )

    def _local_summary(self, context: LocalWatchContext) -> str:
        if context.observations:
            return f"{len(context.observations)} nearby observations are available for context."
        return "Local Watch context is still building."

    def _observation_points(self, context: LocalWatchContext) -> dict[str, Any]:
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [float(observation.longitude), float(observation.latitude)],
                    },
                    "properties": {"observation_id": str(observation.id)},
                }
                for observation in context.observations[:25]
            ],
        }

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
