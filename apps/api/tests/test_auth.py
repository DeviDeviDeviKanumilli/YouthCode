from collections.abc import AsyncGenerator, Generator
from datetime import timedelta
from typing import Any, cast
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.auth import create_access_token
from app.core.config import Settings
from app.db.base import Base
from app.db.session import get_async_session
from app.main import create_app
from app.models import Observation, User


@pytest.fixture
def auth_settings() -> Settings:
    return Settings(
        app_env="test",
        database_health_enabled=False,
        redis_health_enabled=False,
        auth_token_secret="test-secret",
    )


@pytest.fixture
def auth_client(auth_settings: Settings) -> Generator[TestClient, None, None]:
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
    tables = [cast(Table, User.__table__), cast(Table, Observation.__table__)]

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

    import anyio

    anyio.run(create_tables)
    app = create_app(auth_settings)
    app.dependency_overrides[get_async_session] = override_session

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    anyio.run(drop_tables)


def create_user(client: TestClient, role: str) -> dict[str, Any]:
    response = client.post(
        "/users",
        json={"email": f"{role}@example.com", "role": role},
    )
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def test_valid_token_maps_to_local_user(auth_client: TestClient, auth_settings: Settings) -> None:
    user = create_user(auth_client, "researcher")
    token = create_access_token(
        user_id=UUID(str(user["id"])),
        role="researcher",
        settings=auth_settings,
    )

    response = auth_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["id"] == user["id"]
    assert response.json()["role"] == "researcher"


def test_invalid_token_rejected(auth_client: TestClient) -> None:
    response = auth_client.get("/auth/me", headers={"Authorization": "Bearer nope"})

    assert response.status_code == 401
    assert response.json()["code"] == "invalid_token"


def test_expired_token_rejected(auth_client: TestClient, auth_settings: Settings) -> None:
    user = create_user(auth_client, "researcher")
    token = create_access_token(
        user_id=UUID(str(user["id"])),
        role="researcher",
        settings=auth_settings,
        expires_delta=timedelta(seconds=-1),
    )

    response = auth_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.json()["code"] == "invalid_token"


def test_token_can_authorize_research_observations(
    auth_client: TestClient,
    auth_settings: Settings,
) -> None:
    user = create_user(auth_client, "researcher")
    token = create_access_token(
        user_id=UUID(str(user["id"])),
        role="researcher",
        settings=auth_settings,
    )

    response = auth_client.get(
        "/research/observations",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["total"] == 0


def test_anonymous_observation_routes_still_work(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/observations",
        json={
            "timestamp": "2026-06-26T12:00:00Z",
            "latitude": "40.7128",
            "longitude": "-74.0060",
            "region_code": "NY",
        },
    )

    assert response.status_code == 201
    assert response.json()["status"] == "created"
