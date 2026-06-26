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
from app.models import AIIdentification, Observation, Species, User


@pytest.fixture
def identifications_client() -> Generator[TestClient, None, None]:
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
        cast(Table, AIIdentification.__table__),
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


def create_observation(client: TestClient) -> str:
    response = client.post(
        "/observations",
        json={
            "timestamp": "2026-06-26T12:00:00Z",
            "latitude": "40.7128",
            "longitude": "-74.0060",
        },
    )
    assert response.status_code == 201
    body = cast(dict[str, Any], response.json())
    return str(body["observation_id"])


def create_species(client: TestClient) -> str:
    response = client.post(
        "/species",
        json={
            "scientific_name": "Fallopia japonica",
            "common_name": "Japanese knotweed",
        },
    )
    assert response.status_code == 201
    return str(response.json()["id"])


def test_add_candidate_identification(identifications_client: TestClient) -> None:
    observation_id = create_observation(identifications_client)
    species_id = create_species(identifications_client)

    response = identifications_client.post(
        f"/observations/{observation_id}/identifications",
        json={
            "candidate_species_id": species_id,
            "candidate_scientific_name": "Fallopia japonica",
            "candidate_common_name": "Japanese knotweed",
            "confidence": "0.72",
            "model_name": "mock-vision",
            "model_version": "0.1.0",
            "similar_species": [{"scientific_name": "Persicaria perfoliata"}],
            "raw_model_output": {"top_k": 3},
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["observation_id"] == observation_id
    assert body["candidate_species_id"] == species_id
    assert body["confidence_label"] == "medium_high"
    assert body["needs_verification"] is True


def test_confidence_must_be_between_zero_and_one(identifications_client: TestClient) -> None:
    observation_id = create_observation(identifications_client)

    response = identifications_client.post(
        f"/observations/{observation_id}/identifications",
        json={
            "candidate_scientific_name": "Lycorma delicatula",
            "confidence": "1.2",
            "model_name": "mock-vision",
            "model_version": "0.1.0",
        },
    )

    assert response.status_code == 422


def test_list_and_get_identifications(identifications_client: TestClient) -> None:
    observation_id = create_observation(identifications_client)
    created = identifications_client.post(
        f"/observations/{observation_id}/identifications",
        json={
            "candidate_scientific_name": "Trapa natans",
            "candidate_common_name": "Water chestnut",
            "confidence": "0.33",
            "model_name": "mock-vision",
            "model_version": "0.1.0",
        },
    ).json()

    list_response = identifications_client.get(f"/observations/{observation_id}/identifications")
    get_response = identifications_client.get(f"/identifications/{created['id']}")

    assert list_response.status_code == 200
    assert list_response.json()[0]["id"] == created["id"]
    assert get_response.status_code == 200
    assert get_response.json()["confidence_label"] == "low"


def test_missing_observation_rejected(identifications_client: TestClient) -> None:
    response = identifications_client.post(
        "/observations/11111111-1111-1111-1111-111111111111/identifications",
        json={
            "candidate_scientific_name": "Lythrum salicaria",
            "confidence": "0.5",
            "model_name": "mock-vision",
            "model_version": "0.1.0",
        },
    )

    assert response.status_code == 404
    assert response.json()["code"] == "observation_not_found"


def test_missing_candidate_species_rejected(identifications_client: TestClient) -> None:
    observation_id = create_observation(identifications_client)

    response = identifications_client.post(
        f"/observations/{observation_id}/identifications",
        json={
            "candidate_species_id": "11111111-1111-1111-1111-111111111111",
            "candidate_scientific_name": "Unknown species",
            "confidence": "0.5",
            "model_name": "mock-vision",
            "model_version": "0.1.0",
        },
    )

    assert response.status_code == 404
    assert response.json()["code"] == "species_not_found"
