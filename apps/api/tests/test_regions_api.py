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
    Observation,
    SignalScore,
    User,
    Verification,
)


@pytest.fixture
def regions_client() -> Generator[TestClient, None, None]:
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
        cast(Table, Observation.__table__),
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


def create_observation(client: TestClient, lat: str = "40.7128", lon: str = "-74.0060") -> str:
    response = client.post(
        "/observations",
        json={
            "timestamp": "2026-06-26T12:00:00Z",
            "latitude": lat,
            "longitude": lon,
            "region_code": "NY",
        },
    )
    assert response.status_code == 201
    body = cast(dict[str, Any], response.json())
    return str(body["observation_id"])


def enrich_signal(client: TestClient, observation_id: str) -> None:
    identification_response = client.post(
        f"/observations/{observation_id}/identifications",
        json={
            "candidate_scientific_name": "Fallopia japonica",
            "candidate_common_name": "Japanese knotweed",
            "confidence": "0.82",
            "model_name": "mock",
            "model_version": "0.1",
        },
    )
    assert identification_response.status_code == 201
    score_response = client.post(f"/observations/{observation_id}/signal-score/recompute")
    assert score_response.status_code == 200


def test_nearby_region_empty_state(regions_client: TestClient) -> None:
    response = regions_client.get(
        "/regions/nearby",
        params={"lat": "40.7", "lon": "-74.0", "radius_km": "5"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["nearby_signals"] == []
    assert body["simple_map_points"] == []
    assert "No nearby" in body["region_summary"]
    assert "Sparse data" in body["uncertainty_notice"]


def test_nearby_region_includes_observation_points(regions_client: TestClient) -> None:
    observation_id = create_observation(regions_client)
    enrich_signal(regions_client, observation_id)

    response = regions_client.get(
        "/regions/nearby",
        params={"lat": "40.7", "lon": "-74.0", "radius_km": "20"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["simple_map_points"][0]["observation_id"] == observation_id
    assert body["simple_map_points"][0]["possible_species"] == "Japanese knotweed"
    assert body["watched_species"] == ["Japanese knotweed"]
    assert body["nearby_signals"][0]["observation_id"] == observation_id


def test_nearby_region_radius_validation(regions_client: TestClient) -> None:
    response = regions_client.get(
        "/regions/nearby",
        params={"lat": "40.7", "lon": "-74.0", "radius_km": "500"},
    )

    assert response.status_code == 422


def test_nearby_region_excludes_outside_radius(regions_client: TestClient) -> None:
    create_observation(regions_client, lat="42.0", lon="-76.0")

    response = regions_client.get(
        "/regions/nearby",
        params={"lat": "40.7", "lon": "-74.0", "radius_km": "5"},
    )

    assert response.status_code == 200
    assert response.json()["simple_map_points"] == []
