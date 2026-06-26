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
    Species,
    User,
    Verification,
)


@pytest.fixture
def verification_client() -> Generator[TestClient, None, None]:
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


def create_user(client: TestClient, role: str) -> str:
    response = client.post(
        "/users",
        json={"email": f"{role}@example.com", "role": role, "display_name": role},
    )
    assert response.status_code == 201
    return str(response.json()["id"])


def create_observation(client: TestClient) -> str:
    response = client.post(
        "/observations",
        json={
            "timestamp": "2026-06-26T12:00:00Z",
            "latitude": "40.7128",
            "longitude": "-74.0060",
            "region_code": "NY",
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


def test_new_observation_starts_raw(verification_client: TestClient) -> None:
    observation_id = create_observation(verification_client)

    response = verification_client.get(f"/observations/{observation_id}/verification")

    assert response.status_code == 200
    assert response.json()["status"] == "raw"
    assert response.json()["reviewer_id"] is None


def test_reviewer_can_expert_verify(verification_client: TestClient) -> None:
    observation_id = create_observation(verification_client)
    reviewer_id = create_user(verification_client, "reviewer")
    species_id = create_species(verification_client)

    response = verification_client.post(
        f"/verification/{observation_id}",
        json={
            "status": "expert_verified",
            "reviewer_id": reviewer_id,
            "verified_species_id": species_id,
            "review_notes": "Photo evidence is sufficient for expert verification.",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "expert_verified"
    assert body["reviewer_type"] == "reviewer"
    assert body["verified_species_id"] == species_id


def test_consumer_cannot_expert_verify(verification_client: TestClient) -> None:
    observation_id = create_observation(verification_client)
    consumer_id = create_user(verification_client, "consumer")
    species_id = create_species(verification_client)

    response = verification_client.post(
        f"/verification/{observation_id}",
        json={
            "status": "expert_verified",
            "reviewer_id": consumer_id,
            "verified_species_id": species_id,
        },
    )

    assert response.status_code == 403
    assert response.json()["code"] == "verification_forbidden"


def test_rejected_requires_notes(verification_client: TestClient) -> None:
    observation_id = create_observation(verification_client)
    reviewer_id = create_user(verification_client, "reviewer")

    response = verification_client.post(
        f"/verification/{observation_id}",
        json={"status": "rejected", "reviewer_id": reviewer_id},
    )

    assert response.status_code == 422


def test_verified_requires_species(verification_client: TestClient) -> None:
    observation_id = create_observation(verification_client)
    reviewer_id = create_user(verification_client, "reviewer")

    response = verification_client.post(
        f"/verification/{observation_id}",
        json={"status": "field_confirmed", "reviewer_id": reviewer_id},
    )

    assert response.status_code == 422


def test_research_verification_queue(verification_client: TestClient) -> None:
    observation_id = create_observation(verification_client)
    reviewer_id = create_user(verification_client, "reviewer")
    verification_client.get(f"/observations/{observation_id}/verification")
    verification_client.post(
        f"/verification/{observation_id}",
        json={
            "status": "needs_more_evidence",
            "reviewer_id": reviewer_id,
            "review_notes": "Need another image angle.",
        },
    )

    response = verification_client.get("/research/verification-queue")

    assert response.status_code == 200
    assert response.json()[0]["observation_id"] == observation_id
    assert response.json()[0]["verification_status"] == "needs_more_evidence"
