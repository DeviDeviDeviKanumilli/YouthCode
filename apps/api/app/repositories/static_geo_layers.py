import uuid
from collections.abc import Iterable
from decimal import Decimal
from math import asin, cos, radians, sin, sqrt

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.static_geo_layer import (
    KnownRecord,
    RoadTrailType,
    StaticPark,
    StaticRoadTrail,
    StaticWaterway,
)
from app.schemas.static_geo_layers import LayerDistance, NearbyKnownRecord, RoadTrailDistance


class StaticGeoLayerRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def nearest_waterway(
        self,
        latitude: Decimal,
        longitude: Decimal,
    ) -> LayerDistance | None:
        result = await self.session.execute(select(StaticWaterway))
        waterways = list(result.scalars().all())
        return self._nearest_layer(latitude, longitude, waterways)

    async def nearest_road_trail(
        self,
        latitude: Decimal,
        longitude: Decimal,
        layer_type: RoadTrailType,
    ) -> RoadTrailDistance | None:
        result = await self.session.execute(
            select(StaticRoadTrail).where(StaticRoadTrail.type == layer_type)
        )
        layers = list(result.scalars().all())
        nearest = self._nearest_layer(latitude, longitude, layers)
        if nearest is None:
            return None
        return RoadTrailDistance(**nearest.model_dump(), type=layer_type)

    async def nearest_park(
        self,
        latitude: Decimal,
        longitude: Decimal,
    ) -> LayerDistance | None:
        result = await self.session.execute(select(StaticPark))
        parks = list(result.scalars().all())
        return self._nearest_layer(latitude, longitude, parks)

    async def nearby_known_records(
        self,
        latitude: Decimal,
        longitude: Decimal,
        *,
        radius_m: Decimal,
        species_id: uuid.UUID | None = None,
        limit: int = 25,
    ) -> list[NearbyKnownRecord]:
        statement = select(KnownRecord)
        if species_id is not None:
            statement = statement.where(KnownRecord.species_id == species_id)
        result = await self.session.execute(statement)
        records: list[NearbyKnownRecord] = []
        for record in result.scalars().all():
            distance = self.distance_m(
                latitude,
                longitude,
                record.latitude,
                record.longitude,
            )
            if distance <= radius_m:
                records.append(
                    NearbyKnownRecord(
                        id=record.id,
                        species_id=record.species_id,
                        observed_at=record.observed_at,
                        verification_status=record.verification_status,
                        source=record.source,
                        distance_m=distance,
                    )
                )
        return sorted(records, key=lambda item: item.distance_m)[:limit]

    async def list_known_records(
        self,
        *,
        bbox: tuple[Decimal, Decimal, Decimal, Decimal],
        species_id: uuid.UUID | None = None,
        limit: int = 100,
    ) -> list[KnownRecord]:
        min_lon, min_lat, max_lon, max_lat = bbox
        statement = select(KnownRecord).where(
            KnownRecord.longitude >= min_lon,
            KnownRecord.longitude <= max_lon,
            KnownRecord.latitude >= min_lat,
            KnownRecord.latitude <= max_lat,
        )
        if species_id is not None:
            statement = statement.where(KnownRecord.species_id == species_id)
        result = await self.session.execute(statement.limit(limit))
        return list(result.scalars().all())

    async def list_waterways(
        self,
        *,
        bbox: tuple[Decimal, Decimal, Decimal, Decimal],
        limit: int = 100,
    ) -> list[StaticWaterway]:
        min_lon, min_lat, max_lon, max_lat = bbox
        result = await self.session.execute(
            select(StaticWaterway)
            .where(
                StaticWaterway.representative_longitude >= min_lon,
                StaticWaterway.representative_longitude <= max_lon,
                StaticWaterway.representative_latitude >= min_lat,
                StaticWaterway.representative_latitude <= max_lat,
            )
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_roads_trails(
        self,
        *,
        bbox: tuple[Decimal, Decimal, Decimal, Decimal],
        limit: int = 100,
    ) -> list[StaticRoadTrail]:
        min_lon, min_lat, max_lon, max_lat = bbox
        result = await self.session.execute(
            select(StaticRoadTrail)
            .where(
                StaticRoadTrail.representative_longitude >= min_lon,
                StaticRoadTrail.representative_longitude <= max_lon,
                StaticRoadTrail.representative_latitude >= min_lat,
                StaticRoadTrail.representative_latitude <= max_lat,
            )
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_parks(
        self,
        *,
        bbox: tuple[Decimal, Decimal, Decimal, Decimal],
        limit: int = 100,
    ) -> list[StaticPark]:
        min_lon, min_lat, max_lon, max_lat = bbox
        result = await self.session.execute(
            select(StaticPark)
            .where(
                StaticPark.representative_longitude >= min_lon,
                StaticPark.representative_longitude <= max_lon,
                StaticPark.representative_latitude >= min_lat,
                StaticPark.representative_latitude <= max_lat,
            )
            .limit(limit)
        )
        return list(result.scalars().all())

    def _nearest_layer(
        self,
        latitude: Decimal,
        longitude: Decimal,
        layers: Iterable[StaticWaterway | StaticRoadTrail | StaticPark],
    ) -> LayerDistance | None:
        nearest: LayerDistance | None = None
        for layer in layers:
            distance = self.distance_m(
                latitude,
                longitude,
                layer.representative_latitude,
                layer.representative_longitude,
            )
            if nearest is None or distance < nearest.distance_m:
                nearest = LayerDistance(
                    layer_id=layer.id,
                    name=layer.name,
                    source=layer.source,
                    distance_m=distance,
                )
        return nearest

    def distance_m(
        self,
        lat_a: Decimal,
        lon_a: Decimal,
        lat_b: Decimal,
        lon_b: Decimal,
    ) -> Decimal:
        earth_radius_m = 6_371_000
        lat_1 = radians(float(lat_a))
        lat_2 = radians(float(lat_b))
        delta_lat = radians(float(lat_b - lat_a))
        delta_lon = radians(float(lon_b - lon_a))
        haversine = sin(delta_lat / 2) ** 2 + cos(lat_1) * cos(lat_2) * sin(delta_lon / 2) ** 2
        distance = 2 * earth_radius_m * asin(sqrt(haversine))
        return Decimal(str(round(distance, 2)))
