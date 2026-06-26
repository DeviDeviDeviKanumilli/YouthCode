from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import cast

import pytest
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import (
    KnownRecord,
    RoadTrailType,
    Species,
    StaticPark,
    StaticRoadTrail,
    StaticWaterway,
    VerificationStatus,
)
from app.schemas.species import SpeciesCreate
from app.services.species import SpeciesService
from app.services.static_geo_layers import StaticGeoLayerService


@pytest.fixture
async def static_geo_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    tables = [
        cast(Table, Species.__table__),
        cast(Table, StaticWaterway.__table__),
        cast(Table, StaticRoadTrail.__table__),
        cast(Table, StaticPark.__table__),
        cast(Table, KnownRecord.__table__),
    ]
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all, tables=tables)
    async with session_factory() as session:
        yield session
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all, tables=list(reversed(tables)))
    await engine.dispose()


def test_static_layer_migration_adds_spatial_indexes() -> None:
    migration = Path("alembic/versions/0012_create_static_geo_layers.py").read_text()

    assert "ix_waterways_geom" in migration
    assert "ix_roads_trails_geom" in migration
    assert "ix_parks_geom" in migration
    assert "ix_known_records_geom" in migration
    assert 'postgresql_using="gist"' in migration


@pytest.mark.anyio
async def test_distance_to_static_layers(static_geo_session: AsyncSession) -> None:
    static_geo_session.add_all(
        [
            StaticWaterway(
                name="Demo Creek",
                geom="MULTILINESTRING((-74.006 40.713,-74.005 40.714))",
                representative_latitude=Decimal("40.713000"),
                representative_longitude=Decimal("-74.006000"),
                source="demo",
            ),
            StaticRoadTrail(
                name="Demo Road",
                type=RoadTrailType.road,
                geom="MULTILINESTRING((-74.006 40.713,-74.010 40.713))",
                representative_latitude=Decimal("40.713000"),
                representative_longitude=Decimal("-74.007000"),
                source="demo",
            ),
            StaticRoadTrail(
                name="Demo Trail",
                type=RoadTrailType.trail,
                geom="MULTILINESTRING((-74.004 40.713,-74.004 40.714))",
                representative_latitude=Decimal("40.713000"),
                representative_longitude=Decimal("-74.004000"),
                source="demo",
            ),
            StaticPark(
                name="Demo Park",
                geom=(
                    "MULTIPOLYGON((("
                    "-74.006 40.713,-74.005 40.713,-74.005 40.714,-74.006 40.713"
                    ")))"
                ),
                representative_latitude=Decimal("40.714000"),
                representative_longitude=Decimal("-74.005000"),
                source="demo",
            ),
        ]
    )
    await static_geo_session.commit()

    service = StaticGeoLayerService(static_geo_session)
    water = await service.distance_to_nearest_waterway(Decimal("40.712800"), Decimal("-74.006000"))
    road = await service.distance_to_nearest_road(Decimal("40.712800"), Decimal("-74.006000"))
    trail = await service.distance_to_nearest_trail(Decimal("40.712800"), Decimal("-74.006000"))
    park = await service.distance_to_nearest_park(Decimal("40.712800"), Decimal("-74.006000"))

    assert water is not None
    assert water.name == "Demo Creek"
    assert water.distance_m < Decimal("30")
    assert road is not None
    assert road.type == RoadTrailType.road
    assert trail is not None
    assert trail.type == RoadTrailType.trail
    assert park is not None
    assert park.name == "Demo Park"


@pytest.mark.anyio
async def test_nearby_known_records_filters_by_radius_and_species(
    static_geo_session: AsyncSession,
) -> None:
    species = await SpeciesService(static_geo_session).create_species(
        SpeciesCreate(
            scientific_name="Fallopia japonica",
            common_name="Japanese knotweed",
        )
    )
    other_species = await SpeciesService(static_geo_session).create_species(
        SpeciesCreate(
            scientific_name="Lythrum salicaria",
            common_name="Purple loosestrife",
        )
    )
    static_geo_session.add_all(
        [
            KnownRecord(
                species_id=species.id,
                observed_at=datetime(2026, 6, 1, tzinfo=UTC),
                verification_status=VerificationStatus.expert_verified,
                source="demo",
                geom="POINT(-74.006 40.713)",
                latitude=Decimal("40.713000"),
                longitude=Decimal("-74.006000"),
            ),
            KnownRecord(
                species_id=other_species.id,
                observed_at=datetime(2026, 6, 2, tzinfo=UTC),
                verification_status=VerificationStatus.expert_verified,
                source="demo",
                geom="POINT(-74.006 40.713)",
                latitude=Decimal("40.713000"),
                longitude=Decimal("-74.006000"),
            ),
            KnownRecord(
                species_id=species.id,
                observed_at=datetime(2026, 6, 3, tzinfo=UTC),
                verification_status=VerificationStatus.expert_verified,
                source="demo",
                geom="POINT(-75.000 41.000)",
                latitude=Decimal("41.000000"),
                longitude=Decimal("-75.000000"),
            ),
        ]
    )
    await static_geo_session.commit()

    records = await StaticGeoLayerService(static_geo_session).nearby_known_records(
        Decimal("40.712800"),
        Decimal("-74.006000"),
        radius_m=Decimal("100"),
        species_id=species.id,
    )

    assert len(records) == 1
    assert records[0].species_id == species.id
    assert records[0].distance_m < Decimal("30")
