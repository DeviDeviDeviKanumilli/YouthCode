from collections.abc import AsyncGenerator, Generator
from decimal import Decimal
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
)
from app.models.signal_score import SignalScoreLabel
from app.services.signal_scores import label_for_score


@pytest.fixture
def signal_scores_client() -> Generator[TestClient, None, None]:
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
        },
    )
    assert response.status_code == 201
    body = cast(dict[str, Any], response.json())
    return str(body["observation_id"])


def add_identification(client: TestClient, observation_id: str, confidence: str = "0.90") -> None:
    response = client.post(
        f"/observations/{observation_id}/identifications",
        json={
            "candidate_scientific_name": "Fallopia japonica",
            "candidate_common_name": "Japanese knotweed",
            "confidence": confidence,
            "model_name": "mock-vision",
            "model_version": "0.1.0",
        },
    )
    assert response.status_code == 201


def add_context(client: TestClient, observation_id: str) -> None:
    response = client.post(
        f"/observations/{observation_id}/environmental-context",
        json={
            "land_cover_class": "developed_open_space",
            "distance_to_water_m": "75",
            "data_sources": {"provider": "test"},
            "enrichment_version": "test-0.1.0",
        },
    )
    assert response.status_code == 201


def test_recompute_signal_score(signal_scores_client: TestClient) -> None:
    observation_id = create_observation(signal_scores_client)
    add_identification(signal_scores_client, observation_id, confidence="0.90")
    add_context(signal_scores_client, observation_id)

    response = signal_scores_client.post(f"/observations/{observation_id}/signal-score/recompute")

    assert response.status_code == 200
    body = response.json()
    assert body["observation_id"] == observation_id
    assert Decimal(body["identity_confidence"]) == Decimal("90.00")
    assert Decimal(body["final_signal_priority"]) >= Decimal("0")
    assert Decimal(body["final_signal_priority"]) <= Decimal("100")
    assert body["label"] in {
        "low_signal",
        "moderate_signal",
        "high_value_verification_candidate",
        "priority_ecological_signal",
    }
    assert body["model_version"] == "m6.1-rules-0.1.0"


def test_recompute_is_deterministic(signal_scores_client: TestClient) -> None:
    observation_id = create_observation(signal_scores_client)
    add_identification(signal_scores_client, observation_id, confidence="0.72")
    add_context(signal_scores_client, observation_id)

    first = signal_scores_client.post(
        f"/observations/{observation_id}/signal-score/recompute"
    ).json()
    second = signal_scores_client.post(
        f"/observations/{observation_id}/signal-score/recompute"
    ).json()

    assert second["final_signal_priority"] == first["final_signal_priority"]
    assert second["label"] == first["label"]
    assert second["reasons"] == first["reasons"]


def test_get_signal_score(signal_scores_client: TestClient) -> None:
    observation_id = create_observation(signal_scores_client)
    add_identification(signal_scores_client, observation_id)
    signal_scores_client.post(f"/observations/{observation_id}/signal-score/recompute")

    response = signal_scores_client.get(f"/observations/{observation_id}/signal-score")

    assert response.status_code == 200
    assert response.json()["observation_id"] == observation_id


def test_insufficient_evidence_without_identification(signal_scores_client: TestClient) -> None:
    observation_id = create_observation(signal_scores_client)

    response = signal_scores_client.post(f"/observations/{observation_id}/signal-score/recompute")

    assert response.status_code == 200
    body = response.json()
    assert body["label"] == "insufficient_evidence"
    assert body["reasons"][0]["code"] == "missing_identification"


def test_missing_observation_rejected(signal_scores_client: TestClient) -> None:
    response = signal_scores_client.post(
        "/observations/11111111-1111-1111-1111-111111111111/signal-score/recompute"
    )

    assert response.status_code == 404
    assert response.json()["code"] == "observation_not_found"


def test_label_thresholds() -> None:
    assert label_for_score(Decimal("25")) == SignalScoreLabel.low_signal
    assert label_for_score(Decimal("50")) == SignalScoreLabel.moderate_signal
    assert label_for_score(Decimal("75")) == SignalScoreLabel.high_value_verification_candidate
    assert label_for_score(Decimal("76")) == SignalScoreLabel.priority_ecological_signal
    assert label_for_score(Decimal("99"), insufficient_evidence=True) == (
        SignalScoreLabel.insufficient_evidence
    )
