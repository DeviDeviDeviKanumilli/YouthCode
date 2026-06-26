from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from decimal import Decimal
from typing import cast

import pytest
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import (
    Observation,
    RoadTrailType,
    SamplingGridCell,
    SamplingLabel,
    StaticPark,
    StaticRoadTrail,
    Verification,
    VerificationStatus,
)
from app.services.sampling_grid import GridSpec, SamplingGridGenerationService


@pytest.fixture
async def sampling_grid_session() -> AsyncGenerator[AsyncSession, None]:
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
        cast(Table, Observation.__table__),
        cast(Table, Verification.__table__),
        cast(Table, StaticRoadTrail.__table__),
        cast(Table, StaticPark.__table__),
        cast(Table, SamplingGridCell.__table__),
    ]
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all, tables=tables)
    async with session_factory() as session:
        yield session
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all, tables=list(reversed(tables)))
    await engine.dispose()


def grid_spec() -> GridSpec:
    return GridSpec(
        region_code="MVP",
        min_latitude=Decimal("40.0"),
        min_longitude=Decimal("-75.0"),
        max_latitude=Decimal("42.0"),
        max_longitude=Decimal("-73.0"),
        rows=2,
        columns=2,
    )


async def seed_observation(
    session: AsyncSession,
    *,
    latitude: str,
    longitude: str,
    timestamp: datetime,
) -> Observation:
    observation = Observation(
        timestamp=timestamp,
        latitude=Decimal(latitude),
        longitude=Decimal(longitude),
        region_code="MVP",
    )
    session.add(observation)
    await session.flush()
    return observation


@pytest.mark.anyio
async def test_grid_generation_creates_valid_polygons(
    sampling_grid_session: AsyncSession,
) -> None:
    cells = await SamplingGridGenerationService(sampling_grid_session).generate_grid(grid_spec())

    assert len(cells) == 4
    assert all(cell.geom.startswith("POLYGON((") for cell in cells)
    assert all(cell.region_code == "MVP" for cell in cells)


@pytest.mark.anyio
async def test_grid_generation_counts_observations_and_verified_recent_values(
    sampling_grid_session: AsyncSession,
) -> None:
    recent = datetime(2026, 6, 26, tzinfo=UTC)
    older = datetime(2026, 5, 1, tzinfo=UTC)
    first = await seed_observation(
        sampling_grid_session,
        latitude="40.25",
        longitude="-74.75",
        timestamp=recent,
    )
    await seed_observation(
        sampling_grid_session,
        latitude="40.40",
        longitude="-74.60",
        timestamp=older,
    )
    sampling_grid_session.add(
        Verification(
            observation_id=first.id,
            status=VerificationStatus.expert_verified,
        )
    )
    sampling_grid_session.add(
        StaticRoadTrail(
            name="Demo Road",
            type=RoadTrailType.road,
            geom="MULTILINESTRING((-74.5 40.5,-74.4 40.5))",
            representative_latitude=Decimal("40.500000"),
            representative_longitude=Decimal("-74.500000"),
            source="demo",
        )
    )
    await sampling_grid_session.commit()

    cells = await SamplingGridGenerationService(sampling_grid_session).generate_grid(grid_spec())
    populated = next(cell for cell in cells if cell.observation_count == 2)

    assert populated.verified_count == 1
    assert populated.recent_observation_count == 1
    assert populated.sampling_label == SamplingLabel.road_trail_biased
    assert populated.risk_context["generated_by"] == "m8.1-simple-grid"


def test_simple_labels_are_deterministic(sampling_grid_session: AsyncSession) -> None:
    service = SamplingGridGenerationService(sampling_grid_session)

    assert (
        service.assign_simple_label(
            observation_count=5,
            verified_count=2,
            source_count=2,
            distance_to_road_m=None,
            distance_to_trail_m=None,
            distance_to_park_m=None,
        )
        == SamplingLabel.well_sampled
    )
    assert (
        service.assign_simple_label(
            observation_count=2,
            verified_count=0,
            distance_to_road_m=Decimal("50"),
            distance_to_trail_m=None,
            distance_to_park_m=None,
            road_trail_observation_ratio=Decimal("1"),
        )
        == SamplingLabel.road_trail_biased
    )
    assert (
        service.assign_simple_label(
            observation_count=0,
            verified_count=0,
            distance_to_road_m=None,
            distance_to_trail_m=None,
            distance_to_park_m=Decimal("50"),
        )
        == SamplingLabel.likely_false_absence
    )
    assert (
        service.assign_simple_label(
            observation_count=1,
            verified_count=0,
            distance_to_road_m=None,
            distance_to_trail_m=None,
            distance_to_park_m=None,
        )
        == SamplingLabel.under_sampled
    )
