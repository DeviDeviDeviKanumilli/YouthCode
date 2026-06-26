from collections.abc import AsyncGenerator, Generator
from typing import cast

import anyio
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.db.base import Base
from app.db.session import get_async_session
from app.main import create_app
from app.models import SamplingGridCell


@pytest.fixture
def rate_limited_client() -> Generator[TestClient, None, None]:
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
    tables = [cast(Table, SamplingGridCell.__table__)]

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
    app = create_app(
        Settings(
            app_env="test",
            database_health_enabled=False,
            redis_health_enabled=False,
            rate_limit_requests=1,
            rate_limit_window_seconds=60,
        )
    )
    app.dependency_overrides[get_async_session] = override_session

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    anyio.run(drop_tables)


def test_expensive_endpoint_rate_limited(rate_limited_client: TestClient) -> None:
    first = rate_limited_client.get("/sampling-gaps", params={"region_code": "NY"})
    second = rate_limited_client.get("/sampling-gaps", params={"region_code": "NY"})

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["code"] == "rate_limit_exceeded"
