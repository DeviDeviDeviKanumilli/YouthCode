import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.static_geo_layer import RoadTrailType
from app.repositories.static_geo_layers import StaticGeoLayerRepository
from app.schemas.static_geo_layers import LayerDistance, NearbyKnownRecord, RoadTrailDistance


class StaticGeoLayerService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = StaticGeoLayerRepository(session)

    async def distance_to_nearest_waterway(
        self,
        latitude: Decimal,
        longitude: Decimal,
    ) -> LayerDistance | None:
        return await self.repository.nearest_waterway(latitude, longitude)

    async def distance_to_nearest_road(
        self,
        latitude: Decimal,
        longitude: Decimal,
    ) -> RoadTrailDistance | None:
        return await self.repository.nearest_road_trail(latitude, longitude, RoadTrailType.road)

    async def distance_to_nearest_trail(
        self,
        latitude: Decimal,
        longitude: Decimal,
    ) -> RoadTrailDistance | None:
        return await self.repository.nearest_road_trail(latitude, longitude, RoadTrailType.trail)

    async def distance_to_nearest_park(
        self,
        latitude: Decimal,
        longitude: Decimal,
    ) -> LayerDistance | None:
        return await self.repository.nearest_park(latitude, longitude)

    async def nearby_known_records(
        self,
        latitude: Decimal,
        longitude: Decimal,
        *,
        radius_m: Decimal,
        species_id: uuid.UUID | None = None,
        limit: int = 25,
    ) -> list[NearbyKnownRecord]:
        return await self.repository.nearby_known_records(
            latitude,
            longitude,
            radius_m=radius_m,
            species_id=species_id,
            limit=limit,
        )
