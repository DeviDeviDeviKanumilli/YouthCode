from collections.abc import AsyncGenerator
from typing import cast

import pytest
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import (
    AIIdentification,
    EnvironmentalContext,
    Export,
    KnownRecord,
    Media,
    Observation,
    SamplingGridCell,
    SignalScore,
    Species,
    StaticPark,
    StaticRoadTrail,
    StaticWaterway,
    User,
    Verification,
    VerificationEvent,
)
from app.scripts.demo import run_demo


@pytest.fixture
async def demo_script_session() -> AsyncGenerator[AsyncSession, None]:
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
        cast(Table, User.__table__),
        cast(Table, Species.__table__),
        cast(Table, Observation.__table__),
        cast(Table, Media.__table__),
        cast(Table, AIIdentification.__table__),
        cast(Table, EnvironmentalContext.__table__),
        cast(Table, SignalScore.__table__),
        cast(Table, Verification.__table__),
        cast(Table, VerificationEvent.__table__),
        cast(Table, StaticWaterway.__table__),
        cast(Table, StaticRoadTrail.__table__),
        cast(Table, StaticPark.__table__),
        cast(Table, KnownRecord.__table__),
        cast(Table, SamplingGridCell.__table__),
        cast(Table, Export.__table__),
    ]
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all, tables=tables)
    async with session_factory() as session:
        yield session
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all, tables=list(reversed(tables)))
    await engine.dispose()


@pytest.mark.anyio
async def test_backend_demo_script_runs_full_consumer_and_research_flow(
    demo_script_session: AsyncSession,
) -> None:
    result = await run_demo(demo_script_session)

    assert result["seed"] == {"observations": 3, "sampling_grid_cells": 3}
    assert result["consumer_experience"]["observation_id"]
    assert result["consumer_experience"]["media_id"]
    assert result["consumer_experience"]["candidate_species"]
    assert result["consumer_experience"]["environmental_context_version"] == "static-demo-0.1.0"
    assert result["consumer_experience"]["forecast_feature_count"] >= 1
    assert result["research_experience"]["queue_count_before_verification"] >= 1
    assert result["research_experience"]["verification_status"] == "field_confirmed"
    assert result["research_experience"]["csv_export_status"] == "complete"
    assert result["research_experience"]["geojson_export_status"] == "complete"
    assert result["research_experience"]["csv_export_url_prefix"].startswith("data:text/csv")
    assert result["research_experience"]["geojson_export_url_prefix"].startswith(
        "data:application/geo+json"
    )
