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
from app.models import (
    AIIdentification,
    EnvironmentalContext,
    Media,
    Observation,
    SignalScore,
    Species,
    User,
    Verification,
)


@pytest.fixture
def user_sightings_client() -> Generator[TestClient, None, None]:
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
        cast(Table, User.__table__),
        cast(Table, Species.__table__),
        cast(Table, Observation.__table__),
        cast(Table, Media.__table__),
        cast(Table, AIIdentification.__table__),
        cast(Table, EnvironmentalContext.__table__),
        cast(Table, SignalScore.__table__),
        cast(Table, Verification.__table__),
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

    import anyio

    anyio.run(create_tables)
    app = create_app()
    app.dependency_overrides[get_async_session] = override_session

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    anyio.run(drop_tables)


def create_user(client: TestClient, email: str) -> str:
    response = client.post("/users", json={"email": email, "role": "consumer"})
    assert response.status_code == 201
    return str(response.json()["id"])


def create_observation(client: TestClient, user_id: str, timestamp: str) -> str:
    response = client.post(
        "/observations",
        json={
            "user_id": user_id,
            "timestamp": timestamp,
            "latitude": "40.7128",
            "longitude": "-74.0060",
        },
    )
    assert response.status_code == 201
    body = cast(dict[str, Any], response.json())
    return str(body["observation_id"])


def enrich_list_item(client: TestClient, observation_id: str) -> None:
    media_response = client.post(
        f"/observations/{observation_id}/media",
        json={
            "file_type": "image",
            "mime_type": "image/jpeg",
            "storage_key": "photo.jpg",
            "public_url": "http://localhost/photo.jpg",
        },
    )
    assert media_response.status_code == 201
    identification_response = client.post(
        f"/observations/{observation_id}/identifications",
        json={
            "candidate_scientific_name": "Fallopia japonica",
            "candidate_common_name": "Japanese knotweed",
            "confidence": "0.8",
            "model_name": "mock",
            "model_version": "0.1",
        },
    )
    assert identification_response.status_code == 201
    score_response = client.post(f"/observations/{observation_id}/signal-score/recompute")
    assert score_response.status_code == 200


def test_user_observations_only_returns_that_users_sightings(
    user_sightings_client: TestClient,
) -> None:
    user_id = create_user(user_sightings_client, "a@example.com")
    other_user_id = create_user(user_sightings_client, "b@example.com")
    observation_id = create_observation(user_sightings_client, user_id, "2026-06-26T12:00:00Z")
    create_observation(user_sightings_client, other_user_id, "2026-06-26T13:00:00Z")

    response = user_sightings_client.get(f"/users/{user_id}/observations")

    assert response.status_code == 200
    assert [item["observation_id"] for item in response.json()] == [observation_id]


def test_user_observations_include_summary_fields(user_sightings_client: TestClient) -> None:
    user_id = create_user(user_sightings_client, "summary@example.com")
    observation_id = create_observation(user_sightings_client, user_id, "2026-06-26T12:00:00Z")
    enrich_list_item(user_sightings_client, observation_id)

    response = user_sightings_client.get(f"/users/{user_id}/observations")

    assert response.status_code == 200
    item = response.json()[0]
    assert item["thumbnail_url"] == "http://localhost/photo.jpg"
    assert item["possible_species"] == "Japanese knotweed"
    assert item["signal_label"] == "low_signal"
    assert item["verification_status"] == "raw"


def test_user_observations_sort_newest_first_and_paginate(
    user_sightings_client: TestClient,
) -> None:
    user_id = create_user(user_sightings_client, "page@example.com")
    older_id = create_observation(user_sightings_client, user_id, "2026-06-25T12:00:00Z")
    newer_id = create_observation(user_sightings_client, user_id, "2026-06-26T12:00:00Z")

    first_page = user_sightings_client.get(
        f"/users/{user_id}/observations",
        params={"limit": 1, "offset": 0},
    )
    second_page = user_sightings_client.get(
        f"/users/{user_id}/observations",
        params={"limit": 1, "offset": 1},
    )

    assert first_page.status_code == 200
    assert second_page.status_code == 200
    assert first_page.json()[0]["observation_id"] == newer_id
    assert second_page.json()[0]["observation_id"] == older_id


def test_missing_user_rejected(user_sightings_client: TestClient) -> None:
    response = user_sightings_client.get(
        "/users/11111111-1111-1111-1111-111111111111/observations"
    )

    assert response.status_code == 404
    assert response.json()["code"] == "user_not_found"
