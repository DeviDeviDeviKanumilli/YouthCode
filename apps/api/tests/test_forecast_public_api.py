from collections.abc import AsyncGenerator, Generator
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any, cast
from uuid import UUID

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
    KnownRecord,
    Observation,
    RoadTrailType,
    SignalScore,
    SignalScoreLabel,
    Species,
    StaticPark,
    StaticRoadTrail,
    StaticWaterway,
    User,
    VerificationStatus,
)


@pytest.fixture
def forecast_client() -> Generator[TestClient, None, None]:
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
        cast(Table, SignalScore.__table__),
        cast(Table, StaticWaterway.__table__),
        cast(Table, StaticRoadTrail.__table__),
        cast(Table, StaticPark.__table__),
        cast(Table, KnownRecord.__table__),
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
    app.state.session_factory = session_factory
    app.dependency_overrides[get_async_session] = override_session

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    anyio.run(drop_tables)


def create_species(client: TestClient) -> str:
    response = client.post(
        "/species",
        json={"scientific_name": "Fallopia japonica", "common_name": "Japanese knotweed"},
    )
    assert response.status_code == 201
    return str(response.json()["id"])


def create_observation(
    client: TestClient,
    *,
    privacy_level: str = "public",
    lat: str = "40.7128",
    lon: str = "-74.0060",
) -> str:
    response = client.post(
        "/observations",
        json={
            "timestamp": "2026-06-26T12:00:00Z",
            "latitude": lat,
            "longitude": lon,
            "privacy_level": privacy_level,
            "region_code": "NY",
        },
    )
    assert response.status_code == 201
    return str(response.json()["observation_id"])


def add_identification(client: TestClient, observation_id: str, species_id: str) -> None:
    response = client.post(
        f"/observations/{observation_id}/identifications",
        json={
            "candidate_species_id": species_id,
            "candidate_scientific_name": "Fallopia japonica",
            "candidate_common_name": "Japanese knotweed",
            "confidence": "0.82",
            "model_name": "mock",
            "model_version": "0.1",
        },
    )
    assert response.status_code == 201


def seed_score(client: TestClient, observation_id: str, label: SignalScoreLabel) -> None:
    async def seed() -> None:
        session_factory = cast(Any, client.app).state.session_factory
        async with session_factory() as session:
            score = SignalScore(
                observation_id=UUID(observation_id),
                identity_confidence=Decimal("82.00"),
                local_novelty=Decimal("60.00"),
                habitat_match=Decimal("60.00"),
                pathway_risk=Decimal("75.00"),
                nearby_verified_record_context=Decimal("20.00"),
                ecological_sensitivity=Decimal("70.00"),
                sampling_gap_value=Decimal("80.00"),
                temporal_cluster_score=Decimal("15.00"),
                uncertainty_penalty=Decimal("10.00"),
                final_signal_priority=Decimal("55.00"),
                label=label,
                reasons=[],
                model_version="test",
            )
            session.add(score)
            await session.commit()

    import anyio

    anyio.run(seed)


def seed_static_layers(client: TestClient, species_id: str, known_count: int = 1) -> None:
    async def seed() -> None:
        session_factory = cast(Any, client.app).state.session_factory
        async with session_factory() as session:
            session.add_all(
                [
                    StaticWaterway(
                        name="Demo Creek",
                        geom="MULTILINESTRING((-74.006 40.713,-74.005 40.714))",
                        representative_latitude=Decimal("40.713000"),
                        representative_longitude=Decimal("-74.006000"),
                        source="demo_water",
                    ),
                    StaticRoadTrail(
                        name="Demo Trail",
                        type=RoadTrailType.trail,
                        geom="MULTILINESTRING((-74.004 40.713,-74.004 40.714))",
                        representative_latitude=Decimal("40.713000"),
                        representative_longitude=Decimal("-74.004000"),
                        source="demo_trail",
                    ),
                    StaticPark(
                        name="Demo Park",
                        geom=(
                            "MULTIPOLYGON((("
                            "-74.006 40.713,-74.005 40.713,"
                            "-74.005 40.714,-74.006 40.713"
                            ")))"
                        ),
                        representative_latitude=Decimal("40.714000"),
                        representative_longitude=Decimal("-74.005000"),
                        source="demo_park",
                    ),
                ]
            )
            for index in range(known_count):
                session.add(
                    KnownRecord(
                        species_id=UUID(species_id),
                        observed_at=datetime(2026, 6, 1, tzinfo=UTC),
                        verification_status=VerificationStatus.expert_verified,
                        source="state_agency",
                        geom="POINT(-74.006 40.713)",
                        latitude=Decimal("40.713000"),
                        longitude=Decimal("-74.006000") + Decimal(index) * Decimal("0.000001"),
                    )
                )
            await session.commit()

    import anyio

    anyio.run(seed)


def test_public_forecast_requires_extent(forecast_client: TestClient) -> None:
    response = forecast_client.get("/forecast/public")

    assert response.status_code == 422
    assert response.json()["code"] == "forecast_extent_required"


def test_public_forecast_returns_valid_geojson(forecast_client: TestClient) -> None:
    species_id = create_species(forecast_client)
    observation_id = create_observation(forecast_client)
    add_identification(forecast_client, observation_id, species_id)
    seed_score(forecast_client, observation_id, SignalScoreLabel.moderate_signal)
    seed_static_layers(forecast_client, species_id)

    response = forecast_client.get(
        "/forecast/public",
        params={"bbox": "-74.02,40.70,-73.99,40.73"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "FeatureCollection"
    assert body["metadata"]["feature_count"] == len(body["features"])
    layers = {feature["properties"]["layer"] for feature in body["features"]}
    assert "observations" in layers
    assert "known_records" in layers
    assert "possible_corridors" in layers
    assert "waterways" in layers
    assert "roads_trails" in layers
    assert "parks" in layers
    assert "sampling_gap_grid" in layers


def test_public_forecast_applies_privacy_rules(forecast_client: TestClient) -> None:
    species_id = create_species(forecast_client)
    public_id = create_observation(forecast_client)
    private_id = create_observation(forecast_client, privacy_level="private", lat="40.7135")
    obscured_id = create_observation(forecast_client, privacy_level="obscured", lat="40.7188")
    for observation_id in [public_id, private_id, obscured_id]:
        add_identification(forecast_client, observation_id, species_id)

    response = forecast_client.get(
        "/forecast/public",
        params={"bbox": "-74.02,40.70,-73.99,40.73"},
    )

    assert response.status_code == 200
    observation_features = [
        feature
        for feature in response.json()["features"]
        if feature["properties"]["layer"] == "observations"
    ]
    ids = {feature["properties"]["observation_id"] for feature in observation_features}
    assert public_id in ids
    assert obscured_id in ids
    assert private_id not in ids
    obscured_feature = next(
        feature
        for feature in observation_features
        if feature["properties"]["observation_id"] == obscured_id
    )
    assert obscured_feature["geometry"]["coordinates"] == [-74.01, 40.72]


def test_public_forecast_filters_signal_type(forecast_client: TestClient) -> None:
    species_id = create_species(forecast_client)
    matching_id = create_observation(forecast_client, lat="40.7128")
    other_id = create_observation(forecast_client, lat="40.7140")
    for observation_id in [matching_id, other_id]:
        add_identification(forecast_client, observation_id, species_id)
    seed_score(forecast_client, matching_id, SignalScoreLabel.moderate_signal)
    seed_score(forecast_client, other_id, SignalScoreLabel.low_signal)

    response = forecast_client.get(
        "/forecast/public",
        params={
            "bbox": "-74.02,40.70,-73.99,40.73",
            "signal_type": "moderate_signal",
        },
    )

    assert response.status_code == 200
    observation_features = [
        feature
        for feature in response.json()["features"]
        if feature["properties"]["layer"] == "observations"
    ]
    assert [feature["properties"]["observation_id"] for feature in observation_features] == [
        matching_id
    ]


def test_public_forecast_enforces_large_result_limit(forecast_client: TestClient) -> None:
    species_id = create_species(forecast_client)
    seed_static_layers(forecast_client, species_id, known_count=300)

    response = forecast_client.get(
        "/forecast/public",
        params={"bbox": "-74.02,40.70,-73.99,40.73"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["metadata"]["feature_count"] == 250
    assert body["metadata"]["truncated"] is True
