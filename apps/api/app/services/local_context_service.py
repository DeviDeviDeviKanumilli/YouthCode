from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.observation import Observation
from app.models.sampling_grid import SamplingGridCell
from app.models.static_geo_layer import StaticPark, StaticRoadTrail, StaticWaterway
from app.repositories.observations import ObservationRepository
from app.repositories.sampling_grid import SamplingGridRepository
from app.repositories.static_geo_layers import StaticGeoLayerRepository


@dataclass(frozen=True)
class LocalWatchContext:
    latitude: Decimal
    longitude: Decimal
    radius_km: Decimal
    bbox: tuple[Decimal, Decimal, Decimal, Decimal]
    current_month: int
    observations: list[Observation]
    waterways: list[StaticWaterway]
    roads_trails: list[StaticRoadTrail]
    parks: list[StaticPark]
    sampling_cells: list[SamplingGridCell]

    @property
    def radius_m(self) -> Decimal:
        return self.radius_km * Decimal("1000")

    @property
    def region_label(self) -> str:
        region_code = next(
            (
                observation.region_code
                for observation in self.observations
                if observation.region_code is not None
            ),
            None,
        )
        if region_code:
            return f"Near {region_code}"
        return f"Near {self.latitude:.2f}, {self.longitude:.2f}"


class LocalContextService:
    def __init__(self, session: AsyncSession) -> None:
        self.observations = ObservationRepository(session)
        self.static_layers = StaticGeoLayerRepository(session)
        self.sampling_grid = SamplingGridRepository(session)

    async def build(
        self,
        *,
        latitude: Decimal,
        longitude: Decimal,
        radius_km: Decimal,
        now: datetime | None = None,
    ) -> LocalWatchContext:
        degree_delta = radius_km / Decimal("111")
        bbox = (
            longitude - degree_delta,
            latitude - degree_delta,
            longitude + degree_delta,
            latitude + degree_delta,
        )
        return LocalWatchContext(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            bbox=bbox,
            current_month=(now or datetime.now(UTC)).month,
            observations=await self.observations.list(bbox=bbox, limit=250),
            waterways=await self.static_layers.list_waterways(bbox=bbox, limit=100),
            roads_trails=await self.static_layers.list_roads_trails(bbox=bbox, limit=100),
            parks=await self.static_layers.list_parks(bbox=bbox, limit=100),
            sampling_cells=await self.sampling_grid.list_cells(bbox=bbox, limit=100),
        )
