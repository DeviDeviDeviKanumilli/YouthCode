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
def intelligence_client() -> Generator[TestClient, None, None]:
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


def create_observation(client: TestClient) -> str:
    response = client.post(
        "/observations",
        json={
            "timestamp": "2026-06-26T12:00:00Z",
            "latitude": "40.7128",
            "longitude": "-74.0060",
            "region_code": "NY",
            "habitat_answers": {"organism_type": "plant", "near_water": "yes"},
        },
    )
    assert response.status_code == 201
    body = cast(dict[str, Any], response.json())
    return str(body["observation_id"])


def add_identification(client: TestClient, observation_id: str) -> None:
    response = client.post(
        f"/observations/{observation_id}/identifications",
        json={
            "candidate_scientific_name": "Fallopia japonica",
            "candidate_common_name": "Japanese knotweed",
            "confidence": "0.82",
            "model_name": "mock-vision",
            "model_version": "0.1.0",
            "similar_species": [{"scientific_name": "Reynoutria sachalinensis"}],
        },
    )
    assert response.status_code == 201


def add_context_and_score(client: TestClient, observation_id: str) -> None:
    context_response = client.post(
        f"/observations/{observation_id}/environmental-context",
        json={
            "distance_to_water_m": "80",
            "data_sources": {"provider": "test"},
            "enrichment_version": "test-0.1.0",
        },
    )
    assert context_response.status_code == 201
    score_response = client.post(f"/observations/{observation_id}/signal-score/recompute")
    assert score_response.status_code == 200


def test_card_returns_with_partial_data(intelligence_client: TestClient) -> None:
    observation_id = create_observation(intelligence_client)

    response = intelligence_client.get(f"/observations/{observation_id}/intelligence-card")

    assert response.status_code == 200
    body = response.json()
    assert body["observation_id"] == observation_id
    assert body["possible_species"] is None
    assert body["verification_status"] == "raw"
    assert body["uncertainty_notice"]
    assert "observation" in body["data_sources_used"]


def test_card_includes_identification_context_and_sources(intelligence_client: TestClient) -> None:
    observation_id = create_observation(intelligence_client)
    add_identification(intelligence_client, observation_id)
    add_context_and_score(intelligence_client, observation_id)

    response = intelligence_client.get(f"/observations/{observation_id}/intelligence-card")

    assert response.status_code == 200
    body = response.json()
    assert body["possible_species"]["scientific_name"] == "Fallopia japonica"
    assert body["confidence_label"] == "medium_high"
    assert body["similar_species_warning"]
    assert body["signal_priority"] is not None
    assert "This is an AI-assisted suggestion" in body["uncertainty_notice"]
    assert any(
        source.startswith("identification:mock-vision") for source in body["data_sources_used"]
    )
    assert any(source.startswith("signal_score:") for source in body["data_sources_used"])


def test_card_does_not_confirm_raw_ai_sighting(intelligence_client: TestClient) -> None:
    observation_id = create_observation(intelligence_client)
    add_identification(intelligence_client, observation_id)

    response = intelligence_client.get(f"/observations/{observation_id}/intelligence-card")

    assert response.status_code == 200
    text = " ".join(str(value) for value in response.json().values()).lower()
    assert "is a confirmed identification" not in text
    assert "confirmed identification." not in text.replace("not a confirmed identification.", "")
    assert "confirmed invasion" not in text
    assert "guaranteed" not in text


def test_card_can_use_verified_language_after_expert_verification(
    intelligence_client: TestClient,
) -> None:
    observation_id = create_observation(intelligence_client)
    add_identification(intelligence_client, observation_id)
    reviewer = intelligence_client.post(
        "/users",
        json={"email": "reviewer@example.com", "role": "reviewer"},
    ).json()
    species = intelligence_client.post(
        "/species",
        json={"scientific_name": "Fallopia japonica", "common_name": "Japanese knotweed"},
    ).json()
    verification_response = intelligence_client.post(
        f"/verification/{observation_id}",
        json={
            "status": "expert_verified",
            "reviewer_id": reviewer["id"],
            "verified_species_id": species["id"],
            "review_notes": "Verified by reviewer.",
        },
    )
    assert verification_response.status_code == 200

    response = intelligence_client.get(f"/observations/{observation_id}/intelligence-card")

    assert response.status_code == 200
    body = response.json()
    assert body["verification_status"] == "expert_verified"
    assert body["local_status"] == "Verified ecological record"
    assert "verification support" in body["uncertainty_notice"]
