from collections.abc import AsyncGenerator
from typing import cast

import pytest
from sqlalchemy import Table, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import (
    AIIdentification,
    EnvironmentalContext,
    KnownRecord,
    Observation,
    SamplingGridCell,
    SignalScore,
    Species,
    StaticPark,
    StaticRoadTrail,
    StaticWaterway,
    Verification,
)
from app.repositories.species import SpeciesRepository
from app.scripts.seed import MVP_SPECIES, seed_demo_region, seed_species
from app.services.forecast import ForecastService


@pytest.fixture
async def seed_session() -> AsyncGenerator[AsyncSession, None]:
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
    species_table = Species.__table__
    assert isinstance(species_table, Table)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all, tables=[species_table])
    async with session_factory() as session:
        yield session
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all, tables=[species_table])
    await engine.dispose()


@pytest.fixture
async def demo_seed_session() -> AsyncGenerator[AsyncSession, None]:
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
    tables: list[Table] = [
        cast(Table, Species.__table__),
        cast(Table, Observation.__table__),
        cast(Table, AIIdentification.__table__),
        cast(Table, EnvironmentalContext.__table__),
        cast(Table, SignalScore.__table__),
        cast(Table, Verification.__table__),
        cast(Table, StaticWaterway.__table__),
        cast(Table, StaticRoadTrail.__table__),
        cast(Table, StaticPark.__table__),
        cast(Table, KnownRecord.__table__),
        cast(Table, SamplingGridCell.__table__),
    ]
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all, tables=tables)
    async with session_factory() as session:
        yield session
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all, tables=list(reversed(tables)))
    await engine.dispose()


@pytest.mark.anyio
async def test_seed_species_creates_mvp_species(seed_session: AsyncSession) -> None:
    created_count = await seed_species(seed_session)

    result = await seed_session.execute(select(Species))
    species = list(result.scalars().all())
    assert created_count == len(MVP_SPECIES)
    assert {item.common_name for item in species} >= {
        "Japanese knotweed",
        "Spotted lanternfly",
        "Emerald ash borer",
        "Water chestnut",
        "Purple loosestrife",
    }
    knotweed = next(item for item in species if item.scientific_name == "Fallopia japonica")
    assert knotweed.habitat_profile["moisture"] == "mesic_to_wet"
    assert "construction fill" in knotweed.pathway_profile["human_pathways"]


@pytest.mark.anyio
async def test_seed_species_is_idempotent(seed_session: AsyncSession) -> None:
    first_count = await seed_species(seed_session)
    second_count = await seed_species(seed_session)

    result = await seed_session.execute(select(Species))
    species = list(result.scalars().all())
    assert first_count == len(MVP_SPECIES)
    assert second_count == 0
    assert len(species) == len(MVP_SPECIES)


@pytest.mark.anyio
async def test_seeded_species_are_searchable(seed_session: AsyncSession) -> None:
    await seed_species(seed_session)

    matches = await SpeciesRepository(seed_session).search("lanternfly")

    assert len(matches) == 1
    assert matches[0].scientific_name == "Lycorma delicatula"


@pytest.mark.anyio
async def test_seed_demo_region_is_idempotent(demo_seed_session: AsyncSession) -> None:
    first = await seed_demo_region(demo_seed_session)
    second = await seed_demo_region(demo_seed_session)

    observation_count = await demo_seed_session.scalar(
        select(func.count()).select_from(Observation)
    )
    sampling_count = await demo_seed_session.scalar(
        select(func.count()).select_from(SamplingGridCell)
    )

    assert first == {"observations": 3, "sampling_grid_cells": 2}
    assert second == {"observations": 3, "sampling_grid_cells": 2}
    assert observation_count == 3
    assert sampling_count == 2


@pytest.mark.anyio
async def test_seed_demo_region_supports_map_queries(demo_seed_session: AsyncSession) -> None:
    await seed_demo_region(demo_seed_session)

    result = await ForecastService(demo_seed_session).public_forecast(
        bbox="-74.03,40.69,-73.98,40.74",
        latitude=None,
        longitude=None,
        radius_km=None,
        species_id=None,
        signal_type=None,
        verification_status=None,
        from_date=None,
        to_date=None,
        recent_days=None,
    )

    layers = {feature.properties["layer"] for feature in result.features}
    assert "observations" in layers
    assert "known_records" in layers
    assert "waterways" in layers
    assert "roads_trails" in layers
    assert "parks" in layers


@pytest.mark.anyio
async def test_seed_demo_region_supports_scoring(demo_seed_session: AsyncSession) -> None:
    await seed_demo_region(demo_seed_session)

    scores = list((await demo_seed_session.execute(select(SignalScore))).scalars().all())

    assert len(scores) == 3
    assert {score.label.value for score in scores} == {"high_value_verification_candidate"}
