from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.observation import Observation
from app.models.sampling_grid import SamplingGridCell, SamplingLabel
from app.models.static_geo_layer import RoadTrailType
from app.models.verification import VerificationStatus
from app.repositories.observations import ObservationRepository
from app.repositories.sampling_grid import SamplingGridRepository
from app.repositories.static_geo_layers import StaticGeoLayerRepository
from app.repositories.verification import VerificationRepository


@dataclass(frozen=True)
class GridSpec:
    region_code: str
    min_latitude: Decimal
    min_longitude: Decimal
    max_latitude: Decimal
    max_longitude: Decimal
    rows: int = 2
    columns: int = 2


class SamplingGridGenerationService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = SamplingGridRepository(session)
        self.observations = ObservationRepository(session)
        self.verification = VerificationRepository(session)
        self.static_layers = StaticGeoLayerRepository(session)
        self.session = session

    async def generate_grid(self, spec: GridSpec) -> list[SamplingGridCell]:
        observations = await self.observations.list(
            bbox=(
                spec.min_longitude,
                spec.min_latitude,
                spec.max_longitude,
                spec.max_latitude,
            ),
            limit=1000,
        )
        recent_cutoff = self._recent_cutoff(observations)
        cells: list[SamplingGridCell] = []
        lat_step = (spec.max_latitude - spec.min_latitude) / Decimal(spec.rows)
        lon_step = (spec.max_longitude - spec.min_longitude) / Decimal(spec.columns)
        for row in range(spec.rows):
            for column in range(spec.columns):
                min_lat = spec.min_latitude + lat_step * Decimal(row)
                max_lat = min_lat + lat_step
                min_lon = spec.min_longitude + lon_step * Decimal(column)
                max_lon = min_lon + lon_step
                cell_observations = self._observations_in_cell(
                    observations,
                    min_latitude=min_lat,
                    min_longitude=min_lon,
                    max_latitude=max_lat,
                    max_longitude=max_lon,
                )
                verified_count = await self._verified_count(cell_observations)
                recent_count = sum(
                    1
                    for observation in cell_observations
                    if self._as_naive_datetime(observation.timestamp) >= recent_cutoff
                )
                center_lat = (min_lat + max_lat) / Decimal("2")
                center_lon = (min_lon + max_lon) / Decimal("2")
                road = await self.static_layers.nearest_road_trail(
                    center_lat,
                    center_lon,
                    layer_type=RoadTrailType.road,
                )
                trail = await self.static_layers.nearest_road_trail(
                    center_lat,
                    center_lon,
                    layer_type=RoadTrailType.trail,
                )
                park = await self.static_layers.nearest_park(center_lat, center_lon)
                label = self.assign_simple_label(
                    observation_count=len(cell_observations),
                    verified_count=verified_count,
                    distance_to_road_m=road.distance_m if road else None,
                    distance_to_trail_m=trail.distance_m if trail else None,
                    distance_to_park_m=park.distance_m if park else None,
                )
                cells.append(
                    SamplingGridCell(
                        region_code=spec.region_code,
                        geom=self._polygon_wkt(min_lat, min_lon, max_lat, max_lon),
                        min_latitude=min_lat,
                        min_longitude=min_lon,
                        max_latitude=max_lat,
                        max_longitude=max_lon,
                        observation_count=len(cell_observations),
                        verified_count=verified_count,
                        recent_observation_count=recent_count,
                        distance_to_road_m=road.distance_m if road else None,
                        distance_to_trail_m=trail.distance_m if trail else None,
                        distance_to_park_m=park.distance_m if park else None,
                        risk_context={
                            "generated_by": "m8.1-simple-grid",
                            "cell_center": {
                                "latitude": str(center_lat),
                                "longitude": str(center_lon),
                            },
                        },
                        sampling_label=label,
                    )
                )
        created = await self.repository.replace_region(spec.region_code, cells)
        await self.session.commit()
        return created

    def assign_simple_label(
        self,
        *,
        observation_count: int,
        verified_count: int,
        distance_to_road_m: Decimal | None,
        distance_to_trail_m: Decimal | None,
        distance_to_park_m: Decimal | None,
    ) -> SamplingLabel:
        near_road_or_trail = any(
            distance is not None and distance <= Decimal("150")
            for distance in [distance_to_road_m, distance_to_trail_m]
        )
        near_park = distance_to_park_m is not None and distance_to_park_m <= Decimal("150")
        if observation_count >= 5 and verified_count >= 2:
            return SamplingLabel.well_sampled
        if observation_count >= 2:
            if near_road_or_trail:
                return SamplingLabel.road_trail_biased
            if near_park:
                return SamplingLabel.park_biased
            return SamplingLabel.moderately_sampled
        if observation_count == 0 and (near_road_or_trail or near_park):
            return SamplingLabel.likely_false_absence
        return SamplingLabel.under_sampled

    async def _verified_count(self, observations: list[Observation]) -> int:
        count = 0
        for observation in observations:
            verification = await self.verification.get(observation.id)
            if verification and verification.status in {
                VerificationStatus.expert_verified,
                VerificationStatus.field_confirmed,
            }:
                count += 1
        return count

    def _observations_in_cell(
        self,
        observations: list[Observation],
        *,
        min_latitude: Decimal,
        min_longitude: Decimal,
        max_latitude: Decimal,
        max_longitude: Decimal,
    ) -> list[Observation]:
        return [
            observation
            for observation in observations
            if observation.latitude >= min_latitude
            and observation.latitude < max_latitude
            and observation.longitude >= min_longitude
            and observation.longitude < max_longitude
        ]

    def _recent_cutoff(self, observations: list[Observation]) -> datetime:
        if not observations:
            return datetime.now(UTC).replace(tzinfo=None) - timedelta(days=30)
        latest = max(self._as_naive_datetime(observation.timestamp) for observation in observations)
        return latest - timedelta(days=30)

    def _as_naive_datetime(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value
        return value.replace(tzinfo=None)

    def _polygon_wkt(
        self,
        min_latitude: Decimal,
        min_longitude: Decimal,
        max_latitude: Decimal,
        max_longitude: Decimal,
    ) -> str:
        return (
            "POLYGON(("
            f"{min_longitude} {min_latitude},"
            f"{max_longitude} {min_latitude},"
            f"{max_longitude} {max_latitude},"
            f"{min_longitude} {max_latitude},"
            f"{min_longitude} {min_latitude}"
            "))"
        )
