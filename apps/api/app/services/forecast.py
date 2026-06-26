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
from app.models.static_geo_layer import KnownRecord, StaticPark, StaticRoadTrail, StaticWaterway
from app.repositories.identifications import IdentificationRepository
from app.repositories.observations import ObservationRepository
from app.repositories.signal_scores import SignalScoreRepository
from app.repositories.static_geo_layers import StaticGeoLayerRepository
from app.schemas.forecast import GeoJSONFeature, GeoJSONFeatureCollection

PUBLIC_FORECAST_LIMIT = 250


class ForecastService:
    def __init__(self, session: AsyncSession) -> None:
        self.observations = ObservationRepository(session)
        self.identifications = IdentificationRepository(session)
        self.signal_scores = SignalScoreRepository(session)
        self.static_layers = StaticGeoLayerRepository(session)

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
        features.extend(self._corridor_features(observation_features, known_records))
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

    def _known_record_features(self, records: list[KnownRecord]) -> list[GeoJSONFeature]:
        return [
            GeoJSONFeature(
                geometry={
                    "type": "Point",
                    "coordinates": [float(record.longitude), float(record.latitude)],
                },
                properties={
                    "layer": "known_records",
                    "record_id": str(record.id),
                    "species_id": str(record.species_id),
                    "observed_at": record.observed_at.isoformat(),
                    "verification_status": record.verification_status.value,
                    "source": record.source,
                },
            )
            for record in records
        ]

    def _corridor_features(
        self,
        observation_features: list[GeoJSONFeature],
        known_records: list[KnownRecord],
    ) -> list[GeoJSONFeature]:
        if not observation_features or not known_records:
            return []
        observation = observation_features[0]
        record = known_records[0]
        return [
            GeoJSONFeature(
                geometry={
                    "type": "LineString",
                    "coordinates": [
                        observation.geometry["coordinates"],
                        [float(record.longitude), float(record.latitude)],
                    ],
                },
                properties={
                    "layer": "possible_corridors",
                    "basis": "simple observation-to-known-record line",
                    "uncertainty": "illustrative only; not a confirmed movement path",
                },
            )
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
