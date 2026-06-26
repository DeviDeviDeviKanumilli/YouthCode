from collections.abc import AsyncGenerator, Generator
from typing import cast

import anyio
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_async_session
from app.main import create_app
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
from app.scripts.seed import seed_demo_region
from app.services.demo_scenarios import DemoScenarioService

DEMO_TABLES: list[Table] = [
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


@pytest.fixture
async def demo_scenario_session() -> AsyncGenerator[AsyncSession, None]:
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
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all, tables=DEMO_TABLES)
    async with session_factory() as session:
        await seed_demo_region(session)
        yield session
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all, tables=list(reversed(DEMO_TABLES)))
    await engine.dispose()


@pytest.fixture
def demo_scenario_client() -> Generator[TestClient, None, None]:
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

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    async def setup_database() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all, tables=DEMO_TABLES)
        async with session_factory() as session:
            await seed_demo_region(session)

    async def drop_database() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(
                Base.metadata.drop_all,
                tables=list(reversed(DEMO_TABLES)),
            )
        await engine.dispose()

    anyio.run(setup_database)
    app = create_app()
    app.dependency_overrides[get_async_session] = override_session

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    anyio.run(drop_database)


@pytest.mark.anyio
async def test_demo_scenarios_lock_expected_outputs(
    demo_scenario_session: AsyncSession,
) -> None:
    scenarios = await DemoScenarioService(demo_scenario_session).list_scenarios()

    assert len(scenarios.scenarios) == 3
    assert all(scenario.deterministic for scenario in scenarios.scenarios)
    assert all(all(scenario.assertions.values()) for scenario in scenarios.scenarios)


def test_demo_scenarios_api_returns_scripted_scenarios(
    demo_scenario_client: TestClient,
) -> None:
    response = demo_scenario_client.get("/demo/scenarios")

    assert response.status_code == 200
    payload = response.json()
    assert [scenario["id"] for scenario in payload["scenarios"]] == [
        "student_knotweed_near_creek",
        "resident_low_priority_park",
        "student_under_sampled_survey",
    ]
    assert all(all(scenario["assertions"].values()) for scenario in payload["scenarios"])


@pytest.mark.anyio
async def test_student_knotweed_scenario_reports_corridor(
    demo_scenario_session: AsyncSession,
) -> None:
    scenario = await DemoScenarioService(demo_scenario_session).get_scenario(
        "student_knotweed_near_creek"
    )

    assert scenario.observed_outputs.confidence_label == "medium_high"
    assert scenario.observed_outputs.signal_label == "high_value_verification_candidate"
    assert scenario.observed_outputs.corridor_type == "waterway"


@pytest.mark.anyio
async def test_resident_park_scenario_reports_well_sampled_context(
    demo_scenario_session: AsyncSession,
) -> None:
    scenario = await DemoScenarioService(demo_scenario_session).get_scenario(
        "resident_low_priority_park"
    )

    assert scenario.observed_outputs.signal_label == "moderate_signal"
    assert scenario.observed_outputs.sampling_label == "well_sampled"
    assert scenario.assertions["known_nearby_records"] is True


@pytest.mark.anyio
async def test_under_sampled_survey_scenario_reports_queue_priority(
    demo_scenario_session: AsyncSession,
) -> None:
    scenario = await DemoScenarioService(demo_scenario_session).get_scenario(
        "student_under_sampled_survey"
    )

    assert scenario.observed_outputs.sampling_label == "needs_structured_survey"
    assert scenario.assertions["sampling_gap_value_high"] is True
    assert scenario.assertions["researcher_queue_priority"] is True
