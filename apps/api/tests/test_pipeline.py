from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from decimal import Decimal
from typing import cast

import pytest
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.jobs.definitions import register_job_definitions
from app.jobs.queue import InMemoryJobBackend, JobQueue
from app.models import Observation, ObservationPipelineRun, PipelineRunStatus
from app.services.pipeline import ObservationPipelineService


@pytest.fixture
async def pipeline_session() -> AsyncGenerator[AsyncSession, None]:
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
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all, tables=tables)
    async with session_factory() as session:
        yield session
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all, tables=list(reversed(tables)))
    await engine.dispose()


async def seed_observation(session: AsyncSession) -> Observation:
    observation = Observation(
        timestamp=datetime(2026, 6, 26, 12, tzinfo=UTC),
        latitude=Decimal("40.712800"),
        longitude=Decimal("-74.006000"),
    )
    session.add(observation)
    await session.commit()
    return observation


@pytest.mark.anyio
async def test_successful_pipeline_completes_steps(pipeline_session: AsyncSession) -> None:
    observation = await seed_observation(pipeline_session)

    run = await ObservationPipelineService(pipeline_session).run_pipeline(observation.id)

    assert run.status == PipelineRunStatus.complete
    assert [step["name"] for step in run.steps] == [
        "identify_observation",
        "enrich_observation",
        "score_observation",
    ]
    assert all(step["status"] == "complete" for step in run.steps)
    assert run.completed_at is not None


@pytest.mark.anyio
async def test_failed_identification_preserves_observation_and_records_error(
    pipeline_session: AsyncSession,
) -> None:
    observation = await seed_observation(pipeline_session)
    queue = JobQueue(InMemoryJobBackend())
    register_job_definitions(queue)

    async def fail_identification(_: dict[str, object]) -> dict[str, object]:
        raise RuntimeError("provider unavailable")

    queue.register("identify_observation", fail_identification)

    run = await ObservationPipelineService(pipeline_session, queue=queue).run_pipeline(
        observation.id,
    )

    assert run.status == PipelineRunStatus.failed
    assert run.steps[0]["name"] == "identify_observation"
    assert run.steps[0]["status"] == "failed"
    assert "provider unavailable" in str(run.error)
    assert await pipeline_session.get(Observation, observation.id) is not None


@pytest.mark.anyio
async def test_pipeline_start_records_pending_state(pipeline_session: AsyncSession) -> None:
    observation = await seed_observation(pipeline_session)

    run = await ObservationPipelineService(pipeline_session).start_pipeline(observation.id)

    assert run.status == PipelineRunStatus.pending
    assert run.steps == []
    assert run.error is None
