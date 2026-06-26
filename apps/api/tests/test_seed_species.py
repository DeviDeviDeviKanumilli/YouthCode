from collections.abc import AsyncGenerator

import pytest
from sqlalchemy import Table, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import Species
from app.repositories.species import SpeciesRepository
from app.scripts.seed import MVP_SPECIES, seed_species


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
