from collections.abc import AsyncGenerator, Generator
from typing import Any, cast

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_async_session
from app.main import create_app
from app.models import Observation, User


@pytest.fixture
def observations_client() -> Generator[TestClient, None, None]:
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
    user_table = cast(Table, User.__table__)
    observation_table = cast(Table, Observation.__table__)

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    async def create_tables() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(
                Base.metadata.create_all,
                tables=[user_table, observation_table],
            )

    async def drop_tables() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(
                Base.metadata.drop_all,
                tables=[observation_table, user_table],
            )
        await engine.dispose()

    import anyio

    anyio.run(create_tables)
    app = create_app()
    app.dependency_overrides[get_async_session] = override_session

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    anyio.run(drop_tables)


def create_observation(
    client: TestClient,
    latitude: str = "40.7128",
    longitude: str = "-74.0060",
) -> str:
    response = client.post(
        "/observations",
        json={
            "timestamp": "2026-06-26T12:00:00Z",
            "latitude": latitude,
            "longitude": longitude,
            "coordinate_uncertainty_m": "12.5",
            "region_code": "NY",
            "source": "consumer_app",
            "raw_note": "Possible knotweed near the creek.",
            "habitat_answers": {"near_water": "yes"},
            "privacy_level": "public",
        },
    )
    assert response.status_code == 201
    body = cast(dict[str, Any], response.json())
    return str(body["observation_id"])


def test_create_observation_returns_next_steps(observations_client: TestClient) -> None:
    observation_id = create_observation(observations_client)

    response = observations_client.get(f"/observations/{observation_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == observation_id
    assert body["latitude"] == "40.712800"
    assert body["longitude"] == "-74.006000"
    assert body["habitat_answers"] == {"near_water": "yes"}
    assert body["privacy_level"] == "public"


def test_invalid_coordinates_rejected(observations_client: TestClient) -> None:
    response = observations_client.post(
        "/observations",
        json={"latitude": "91", "longitude": "-74.0"},
    )

    assert response.status_code == 422


def test_bbox_filter_returns_matching_observations(observations_client: TestClient) -> None:
    inside_id = create_observation(observations_client, latitude="40.7", longitude="-74.0")
    create_observation(observations_client, latitude="41.5", longitude="-75.5")

    response = observations_client.get(
        "/observations",
        params={"bbox": "-74.5,40.0,-73.5,41.0"},
    )

    assert response.status_code == 200
    ids = [item["id"] for item in response.json()]
    assert ids == [inside_id]


def test_date_filter_returns_matching_observations(observations_client: TestClient) -> None:
    observation_id = create_observation(observations_client)

    response = observations_client.get(
        "/observations",
        params={
            "from_date": "2026-06-01T00:00:00Z",
            "to_date": "2026-07-01T00:00:00Z",
        },
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [observation_id]


def test_update_observation(observations_client: TestClient) -> None:
    observation_id = create_observation(observations_client)

    response = observations_client.patch(
        f"/observations/{observation_id}",
        json={
            "raw_note": "Updated note.",
            "privacy_level": "obscured",
            "habitat_answers": {"near_water": "unknown"},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["raw_note"] == "Updated note."
    assert body["privacy_level"] == "obscured"
    assert body["habitat_answers"] == {"near_water": "unknown"}


def test_invalid_bbox_rejected(observations_client: TestClient) -> None:
    response = observations_client.get("/observations", params={"bbox": "-74,40"})

    assert response.status_code == 422
