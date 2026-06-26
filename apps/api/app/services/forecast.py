import uuid
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.identification import AIIdentification
from app.models.observation import Observation, PrivacyLevel
from app.models.signal_score import SignalScoreLabel
from app.models.static_geo_layer import (
    KnownRecord,
    RoadTrailType,
    StaticPark,
    StaticRoadTrail,
    StaticWaterway,
)
from app.models.user import UserRole
from app.models.verification import VerificationStatus
from app.repositories.identifications import IdentificationRepository
from app.repositories.observations import ObservationRepository
from app.repositories.signal_scores import SignalScoreRepository
from app.repositories.static_geo_layers import StaticGeoLayerRepository
from app.repositories.users import UserRepository
from app.repositories.verification import VerificationRepository
from app.schemas.forecast import GeoJSONFeature, GeoJSONFeatureCollection

PUBLIC_FORECAST_LIMIT = 250
RESEARCH_FORECAST_LIMIT = 500
RESEARCH_LAYERS = {
    "observations",
    "verified_records",
    "unverified_records",
    "waterways",
    "roads_trails",
    "parks",
    "possible_corridors",
    "sampling_gap_grid",
    "signal_clusters",
}


class ForecastService:
    def __init__(self, session: AsyncSession) -> None:
        self.observations = ObservationRepository(session)
        self.identifications = IdentificationRepository(session)
        self.signal_scores = SignalScoreRepository(session)
        self.static_layers = StaticGeoLayerRepository(session)
        self.users = UserRepository(session)
        self.verification = VerificationRepository(session)

    async def public_forecast(
        self,
        *,
        bbox: str | None,
        latitude: Decimal | None,
        longitude: Decimal | None,
        radius_km: Decimal | None,
        species_id: uuid.UUID | None,
        signal_type: SignalScoreLabel | None,
        from_date: datetime | None,
        to_date: datetime | None,
    ) -> GeoJSONFeatureCollection:
        resolved_bbox = self._resolve_bbox(
            bbox=bbox,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
        )
        features: list[GeoJSONFeature] = []
        observations = await self.observations.list(
            bbox=resolved_bbox,
            from_date=from_date,
            to_date=to_date,
            limit=PUBLIC_FORECAST_LIMIT,
        )
        public_observations = [
            observation
            for observation in observations
            if observation.privacy_level != PrivacyLevel.private
        ]
        observation_features = await self._observation_features(
            public_observations,
            species_id=species_id,
            signal_type=signal_type,
        )
        known_records = await self.static_layers.list_known_records(
            bbox=resolved_bbox,
            species_id=species_id,
            limit=PUBLIC_FORECAST_LIMIT,
        )
        features.extend(observation_features)
        features.extend(self._known_record_features(known_records))
        features.extend(await self._possible_corridor_features(observation_features))
        features.extend(
            self._waterway_features(
                await self.static_layers.list_waterways(
                    bbox=resolved_bbox,
                    limit=PUBLIC_FORECAST_LIMIT,
                )
            )
        )
        features.extend(
            self._road_trail_features(
                await self.static_layers.list_roads_trails(
                    bbox=resolved_bbox,
                    limit=PUBLIC_FORECAST_LIMIT,
                )
            )
        )
        features.extend(
            self._park_features(
                await self.static_layers.list_parks(
                    bbox=resolved_bbox,
                    limit=PUBLIC_FORECAST_LIMIT,
                )
            )
        )
        features.append(self._sampling_gap_feature(resolved_bbox, len(public_observations)))
        limited_features = features[:PUBLIC_FORECAST_LIMIT]
        return GeoJSONFeatureCollection(
            features=limited_features,
            metadata={
                "bbox": [str(value) for value in resolved_bbox],
                "feature_count": len(limited_features),
                "limit": PUBLIC_FORECAST_LIMIT,
                "truncated": len(features) > PUBLIC_FORECAST_LIMIT,
                "privacy": "Private observations are excluded; obscured observations are rounded.",
            },
        )

    async def research_forecast(
        self,
        *,
        requester_id: uuid.UUID,
        bbox: str | None,
        latitude: Decimal | None,
        longitude: Decimal | None,
        radius_km: Decimal | None,
        species_id: uuid.UUID | None,
        verification_status: VerificationStatus | None,
        layers: list[str] | None,
        from_date: datetime | None,
        to_date: datetime | None,
    ) -> GeoJSONFeatureCollection:
        await self._require_research_access(requester_id)
        requested_layers = self._resolve_research_layers(layers)
        resolved_bbox = self._resolve_bbox(
            bbox=bbox,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
        )
        features: list[GeoJSONFeature] = []
        observations = await self.observations.list(
            bbox=resolved_bbox,
            from_date=from_date,
            to_date=to_date,
            limit=RESEARCH_FORECAST_LIMIT,
        )
        if "observations" in requested_layers:
            features.extend(
                await self._research_observation_features(
                    observations,
                    species_id=species_id,
                    verification_status=verification_status,
                )
            )
        known_records = await self.static_layers.list_known_records(
            bbox=resolved_bbox,
            species_id=species_id,
            limit=RESEARCH_FORECAST_LIMIT,
        )
        verified_records = [
            record
            for record in known_records
            if record.verification_status
            in {VerificationStatus.expert_verified, VerificationStatus.field_confirmed}
        ]
        unverified_records = [record for record in known_records if record not in verified_records]
        if verification_status is not None:
            verified_records = [
                record
                for record in verified_records
                if record.verification_status == verification_status
            ]
            unverified_records = [
                record
                for record in unverified_records
                if record.verification_status == verification_status
            ]
        if "verified_records" in requested_layers:
            features.extend(self._known_record_features(verified_records, layer="verified_records"))
        if "unverified_records" in requested_layers:
            features.extend(
                self._known_record_features(unverified_records, layer="unverified_records")
            )
        if "possible_corridors" in requested_layers:
            observation_features = await self._research_observation_features(
                observations,
                species_id=species_id,
                verification_status=verification_status,
            )
            features.extend(await self._possible_corridor_features(observation_features))
        if "waterways" in requested_layers:
            features.extend(
                self._waterway_features(
                    await self.static_layers.list_waterways(
                        bbox=resolved_bbox,
                        limit=RESEARCH_FORECAST_LIMIT,
                    )
                )
            )
        if "roads_trails" in requested_layers:
            features.extend(
                self._road_trail_features(
                    await self.static_layers.list_roads_trails(
                        bbox=resolved_bbox,
                        limit=RESEARCH_FORECAST_LIMIT,
                    )
                )
            )
        if "parks" in requested_layers:
            features.extend(
                self._park_features(
                    await self.static_layers.list_parks(
                        bbox=resolved_bbox,
                        limit=RESEARCH_FORECAST_LIMIT,
                    )
                )
            )
        if "sampling_gap_grid" in requested_layers:
            features.append(self._sampling_gap_feature(resolved_bbox, len(observations)))
        if "signal_clusters" in requested_layers:
            features.extend(await self._signal_cluster_features(observations))
        limited_features = features[:RESEARCH_FORECAST_LIMIT]
        return GeoJSONFeatureCollection(
            features=limited_features,
            metadata={
                "bbox": [str(value) for value in resolved_bbox],
                "feature_count": len(limited_features),
                "limit": RESEARCH_FORECAST_LIMIT,
                "truncated": len(features) > RESEARCH_FORECAST_LIMIT,
                "layers": sorted(requested_layers),
                "pagination_strategy": (
                    "MVP returns a capped FeatureCollection. Research dashboard should request "
                    "smaller bbox tiles or repeat with narrower layer filters."
                ),
            },
        )

    async def _observation_features(
        self,
        observations: list[Observation],
        *,
        species_id: uuid.UUID | None,
        signal_type: SignalScoreLabel | None,
    ) -> list[GeoJSONFeature]:
        features: list[GeoJSONFeature] = []
        for observation in observations:
            identification = await self._latest_identification(observation.id)
            if species_id is not None and (
                identification is None or identification.candidate_species_id != species_id
            ):
                continue
            score = await self.signal_scores.get(observation.id)
            if signal_type is not None and (score is None or score.label != signal_type):
                continue
            latitude, longitude = self._public_coordinates(observation)
            features.append(
                GeoJSONFeature(
                    geometry={
                        "type": "Point",
                        "coordinates": [float(longitude), float(latitude)],
                    },
                    properties={
                        "layer": "observations",
                        "observation_id": str(observation.id),
                        "observed_at": observation.timestamp.isoformat(),
                        "privacy_level": observation.privacy_level.value,
                        "possible_species": (
                            identification.candidate_common_name
                            or identification.candidate_scientific_name
                            if identification
                            else None
                        ),
                        "candidate_species_id": (
                            str(identification.candidate_species_id)
                            if identification and identification.candidate_species_id
                            else None
                        ),
                        "signal_label": score.label.value if score else None,
                    },
                )
            )
        return features

    async def _latest_identification(self, observation_id: uuid.UUID) -> AIIdentification | None:
        identifications = await self.identifications.list_for_observation(observation_id)
        return identifications[0] if identifications else None

    async def _research_observation_features(
        self,
        observations: list[Observation],
        *,
        species_id: uuid.UUID | None,
        verification_status: VerificationStatus | None,
    ) -> list[GeoJSONFeature]:
        features: list[GeoJSONFeature] = []
        for observation in observations:
            identification = await self._latest_identification(observation.id)
            if species_id is not None and (
                identification is None or identification.candidate_species_id != species_id
            ):
                continue
            verification = await self.verification.get(observation.id)
            if verification_status is not None and (
                verification is None or verification.status != verification_status
            ):
                continue
            score = await self.signal_scores.get(observation.id)
            features.append(
                GeoJSONFeature(
                    geometry={
                        "type": "Point",
                        "coordinates": [float(observation.longitude), float(observation.latitude)],
                    },
                    properties={
                        "layer": "observations",
                        "observation_id": str(observation.id),
                        "observed_at": observation.timestamp.isoformat(),
                        "privacy_level": observation.privacy_level.value,
                        "possible_species": (
                            identification.candidate_common_name
                            or identification.candidate_scientific_name
                            if identification
                            else None
                        ),
                        "candidate_species_id": (
                            str(identification.candidate_species_id)
                            if identification and identification.candidate_species_id
                            else None
                        ),
                        "verification_status": verification.status.value if verification else "raw",
                        "signal_label": score.label.value if score else None,
                    },
                )
            )
        return features

    def _known_record_features(
        self,
        records: list[KnownRecord],
        layer: str = "known_records",
    ) -> list[GeoJSONFeature]:
        return [
            GeoJSONFeature(
                geometry={
                    "type": "Point",
                    "coordinates": [float(record.longitude), float(record.latitude)],
                },
                properties={
                    "layer": layer,
                    "record_id": str(record.id),
                    "species_id": str(record.species_id),
                    "observed_at": record.observed_at.isoformat(),
                    "verification_status": record.verification_status.value,
                    "source": record.source,
                },
            )
            for record in records
        ]

    async def _signal_cluster_features(
        self,
        observations: list[Observation],
    ) -> list[GeoJSONFeature]:
        features: list[GeoJSONFeature] = []
        for observation in observations:
            score = await self.signal_scores.get(observation.id)
            if score is None or score.label not in {
                SignalScoreLabel.high_value_verification_candidate,
                SignalScoreLabel.priority_ecological_signal,
            }:
                continue
            features.append(
                GeoJSONFeature(
                    geometry={
                        "type": "Point",
                        "coordinates": [float(observation.longitude), float(observation.latitude)],
                    },
                    properties={
                        "layer": "signal_clusters",
                        "observation_id": str(observation.id),
                        "signal_label": score.label.value,
                        "final_signal_priority": str(score.final_signal_priority),
                    },
                )
            )
        return features

    async def _possible_corridor_features(
        self,
        observation_features: list[GeoJSONFeature],
    ) -> list[GeoJSONFeature]:
        features: list[GeoJSONFeature] = []
        for observation in observation_features[:25]:
            coordinates = observation.geometry["coordinates"]
            longitude = Decimal(str(coordinates[0]))
            latitude = Decimal(str(coordinates[1]))
            corridor = await self._nearest_corridor_context(latitude, longitude)
            if corridor is None:
                continue
            endpoint, properties = corridor
            features.append(
                GeoJSONFeature(
                    geometry={
                        "type": "LineString",
                        "coordinates": [coordinates, endpoint],
                    },
                    properties={
                        "layer": "possible_corridors",
                        "observation_id": observation.properties.get("observation_id"),
                        **properties,
                        "label": "possible corridor",
                        "uncertainty": (
                            "Illustrative possible corridor only; not a prediction or "
                            "confirmed movement path."
                        ),
                    },
                )
            )
        return features

    async def _nearest_corridor_context(
        self,
        latitude: Decimal,
        longitude: Decimal,
    ) -> tuple[list[float], dict[str, str]] | None:
        waterway = await self.static_layers.nearest_waterway(latitude, longitude)
        if waterway is not None and waterway.distance_m <= Decimal("250"):
            return (
                await self._layer_endpoint(waterway.layer_id, "waterways"),
                {
                    "corridor_type": "waterway",
                    "basis": "Sighting is near a mapped waterway context layer.",
                    "distance_m": str(waterway.distance_m),
                    "source": waterway.source,
                },
            )
        road = await self.static_layers.nearest_road_trail(latitude, longitude, RoadTrailType.road)
        trail = await self.static_layers.nearest_road_trail(
            latitude,
            longitude,
            RoadTrailType.trail,
        )
        candidates = [candidate for candidate in [road, trail] if candidate is not None]
        if not candidates:
            return None
        nearest = min(candidates, key=lambda candidate: candidate.distance_m)
        if nearest.distance_m > Decimal("250"):
            return None
        return (
            await self._layer_endpoint(nearest.layer_id, "roads_trails"),
            {
                "corridor_type": nearest.type.value,
                "basis": "Sighting is near a mapped road or trail context layer.",
                "distance_m": str(nearest.distance_m),
                "source": nearest.source,
            },
        )

    async def _layer_endpoint(self, layer_id: uuid.UUID, layer: str) -> list[float]:
        if layer == "waterways":
            waterways = await self.static_layers.list_waterways(
                bbox=(Decimal("-180"), Decimal("-90"), Decimal("180"), Decimal("90")),
                limit=PUBLIC_FORECAST_LIMIT,
            )
            selected = next(waterway for waterway in waterways if waterway.id == layer_id)
            return [
                float(selected.representative_longitude),
                float(selected.representative_latitude),
            ]
        roads_trails = await self.static_layers.list_roads_trails(
            bbox=(Decimal("-180"), Decimal("-90"), Decimal("180"), Decimal("90")),
            limit=PUBLIC_FORECAST_LIMIT,
        )
        selected_road_trail = next(
            road_trail for road_trail in roads_trails if road_trail.id == layer_id
        )
        return [
            float(selected_road_trail.representative_longitude),
            float(selected_road_trail.representative_latitude),
        ]

    def _waterway_features(self, waterways: list[StaticWaterway]) -> list[GeoJSONFeature]:
        return [
            self._representative_point_feature(
                layer="waterways",
                layer_id=waterway.id,
                name=waterway.name,
                source=waterway.source,
                latitude=waterway.representative_latitude,
                longitude=waterway.representative_longitude,
            )
            for waterway in waterways
        ]

    def _road_trail_features(self, roads_trails: list[StaticRoadTrail]) -> list[GeoJSONFeature]:
        return [
            self._representative_point_feature(
                layer="roads_trails",
                layer_id=road_trail.id,
                name=road_trail.name,
                source=road_trail.source,
                latitude=road_trail.representative_latitude,
                longitude=road_trail.representative_longitude,
                extra={"type": road_trail.type.value},
            )
            for road_trail in roads_trails
        ]

    def _park_features(self, parks: list[StaticPark]) -> list[GeoJSONFeature]:
        return [
            self._representative_point_feature(
                layer="parks",
                layer_id=park.id,
                name=park.name,
                source=park.source,
                latitude=park.representative_latitude,
                longitude=park.representative_longitude,
            )
            for park in parks
        ]

    def _representative_point_feature(
        self,
        *,
        layer: str,
        layer_id: uuid.UUID,
        name: str | None,
        source: str,
        latitude: Decimal,
        longitude: Decimal,
        extra: dict[str, Any] | None = None,
    ) -> GeoJSONFeature:
        properties = {
            "layer": layer,
            "layer_id": str(layer_id),
            "name": name,
            "source": source,
            **(extra or {}),
        }
        return GeoJSONFeature(
            geometry={
                "type": "Point",
                "coordinates": [float(longitude), float(latitude)],
            },
            properties=properties,
        )

    def _sampling_gap_feature(
        self,
        bbox: tuple[Decimal, Decimal, Decimal, Decimal],
        observation_count: int,
    ) -> GeoJSONFeature:
        min_lon, min_lat, max_lon, max_lat = bbox
        return GeoJSONFeature(
            geometry={
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
            },
            properties={
                "layer": "sampling_gap_grid",
                "observation_count": observation_count,
                "under_sampled": observation_count < 5,
                "note": "Simplified MVP sampling gap cell for public map context.",
            },
        )

    def _public_coordinates(self, observation: Observation) -> tuple[Decimal, Decimal]:
        if observation.privacy_level == PrivacyLevel.obscured:
            return (
                observation.latitude.quantize(Decimal("0.01")),
                observation.longitude.quantize(Decimal("0.01")),
            )
        return observation.latitude, observation.longitude

    def _resolve_bbox(
        self,
        *,
        bbox: str | None,
        latitude: Decimal | None,
        longitude: Decimal | None,
        radius_km: Decimal | None,
    ) -> tuple[Decimal, Decimal, Decimal, Decimal]:
        if bbox is not None:
            return self._parse_bbox(bbox)
        if latitude is not None and longitude is not None and radius_km is not None:
            if radius_km <= Decimal("0") or radius_km > Decimal("100"):
                raise AppError(
                    code="invalid_radius",
                    message="radius_km must be greater than 0 and no more than 100.",
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                )
            degree_delta = radius_km / Decimal("111")
            return (
                longitude - degree_delta,
                latitude - degree_delta,
                longitude + degree_delta,
                latitude + degree_delta,
            )
        raise AppError(
            code="forecast_extent_required",
            message="Provide either bbox or lat, lon, and radius_km.",
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    def _parse_bbox(self, bbox: str) -> tuple[Decimal, Decimal, Decimal, Decimal]:
        try:
            parts = [Decimal(part.strip()) for part in bbox.split(",")]
        except (InvalidOperation, ValueError) as exc:
            raise AppError(
                code="invalid_bbox",
                message="bbox must contain min_lon,min_lat,max_lon,max_lat.",
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            ) from exc
        if len(parts) != 4:
            raise AppError(
                code="invalid_bbox",
                message="bbox must contain min_lon,min_lat,max_lon,max_lat.",
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
        min_lon, min_lat, max_lon, max_lat = parts
        if min_lon >= max_lon or min_lat >= max_lat:
            raise AppError(
                code="invalid_bbox",
                message="bbox minimums must be less than maximums.",
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
        return min_lon, min_lat, max_lon, max_lat

    async def _require_research_access(self, requester_id: uuid.UUID) -> None:
        requester = await self.users.get(requester_id)
        if requester is None:
            raise AppError(
                code="requester_not_found",
                message="Requester was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if requester.role not in {UserRole.researcher, UserRole.reviewer, UserRole.admin}:
            raise AppError(
                code="research_forecast_forbidden",
                message="Research forecast layers require researcher, reviewer, or admin access.",
                status_code=status.HTTP_403_FORBIDDEN,
            )

    def _resolve_research_layers(self, layers: list[str] | None) -> set[str]:
        if not layers:
            return set(RESEARCH_LAYERS)
        requested_layers = set(layers)
        invalid_layers = requested_layers - RESEARCH_LAYERS
        if invalid_layers:
            raise AppError(
                code="invalid_forecast_layer",
                message=f"Unsupported forecast layer: {', '.join(sorted(invalid_layers))}.",
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
        return requested_layers
