from collections.abc import AsyncGenerator, Generator
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any, cast

import anyio
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_async_session
from app.main import create_app
from app.models import Observation, ObservationPipelineRun, PipelineRunStatus


@pytest.fixture
def pipeline_status_client() -> Generator[TestClient, None, None]:
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
        cast(Table, ObservationPipelineRun.__table__),
    ]

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    async def create_tables() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all, tables=tables)

    async def drop_tables() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all, tables=list(reversed(tables)))
        await engine.dispose()

    anyio.run(create_tables)
    app = create_app()
    app.state.session_factory = session_factory
    app.dependency_overrides[get_async_session] = override_session

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    anyio.run(drop_tables)


def seed_observation(client: TestClient) -> str:
    async def seed() -> str:
        session_factory = cast(Any, client.app).state.session_factory
        async with session_factory() as session:
            observation = Observation(
                timestamp=datetime(2026, 6, 26, 12, tzinfo=UTC),
                latitude=Decimal("40.712800"),
                longitude=Decimal("-74.006000"),
            )
            session.add(observation)
            await session.commit()
            return str(observation.id)

    return anyio.run(seed)


def seed_run(
    client: TestClient,
    observation_id: str,
    *,
    status: PipelineRunStatus,
    steps: list[dict[str, str | None]],
) -> None:
    async def seed() -> None:
        session_factory = cast(Any, client.app).state.session_factory
        async with session_factory() as session:
            session.add(
                ObservationPipelineRun(
                    observation_id=observation_id,
                    status=status,
                    steps=steps,
                )
            )
            await session.commit()

    anyio.run(seed)


def test_pipeline_status_pending_without_run(pipeline_status_client: TestClient) -> None:
    observation_id = seed_observation(pipeline_status_client)

    response = pipeline_status_client.get(f"/observations/{observation_id}/pipeline-status")

    assert response.status_code == 200
    body = response.json()
    assert body["current_status"] == "pending"
    assert body["completed_steps"] == []
    assert body["failed_steps"] == []


def test_pipeline_status_complete(pipeline_status_client: TestClient) -> None:
    observation_id = seed_observation(pipeline_status_client)
    seed_run(
        pipeline_status_client,
        observation_id,
        status=PipelineRunStatus.complete,
        steps=[
            {"name": "identify_observation", "status": "complete", "error": None},
            {"name": "enrich_observation", "status": "complete", "error": None},
        ],
    )

    response = pipeline_status_client.get(f"/observations/{observation_id}/pipeline-status")

    assert response.status_code == 200
    body = response.json()
    assert body["current_status"] == "complete"
    assert body["completed_steps"] == ["identify_observation", "enrich_observation"]
    assert body["next_available_user_action"] == "review_results"


def test_pipeline_status_failed(pipeline_status_client: TestClient) -> None:
    observation_id = seed_observation(pipeline_status_client)
    seed_run(
        pipeline_status_client,
        observation_id,
        status=PipelineRunStatus.failed,
        steps=[
            {"name": "identify_observation", "status": "failed", "error": "provider unavailable"}
        ],
    )

    response = pipeline_status_client.get(f"/observations/{observation_id}/pipeline-status")

    assert response.status_code == 200
    body = response.json()
    assert body["current_status"] == "failed"
    assert body["failed_steps"] == [
        {"name": "identify_observation", "error": "provider unavailable"}
    ]
    assert body["next_available_user_action"] == "review_error_and_retry_or_add_evidence"
