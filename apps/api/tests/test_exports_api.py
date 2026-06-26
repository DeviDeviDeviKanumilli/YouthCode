from base64 import b64decode
from collections.abc import AsyncGenerator, Generator
from csv import DictReader
from datetime import UTC, datetime
from decimal import Decimal
from io import StringIO
from typing import Any, cast

import anyio
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
    ConfidenceLabel,
    EnvironmentalContext,
    Export,
    KnownRecord,
    Media,
    Observation,
    PrivacyLevel,
    SamplingGridCell,
    SignalScore,
    SignalScoreLabel,
    Species,
    User,
    Verification,
    VerificationStatus,
)


@pytest.fixture
def exports_client() -> Generator[TestClient, None, None]:
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
        cast(Table, Media.__table__),
        cast(Table, EnvironmentalContext.__table__),
        cast(Table, SignalScore.__table__),
        cast(Table, Verification.__table__),
        cast(Table, KnownRecord.__table__),
        cast(Table, SamplingGridCell.__table__),
        cast(Table, Export.__table__),
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


def create_researcher(client: TestClient) -> str:
    response = client.post(
        "/users",
        json={
            "email": "researcher@example.com",
            "role": "researcher",
            "display_name": "Researcher",
        },
    )
    assert response.status_code == 201
    return str(response.json()["id"])


def decoded_csv_rows(download_url: str) -> list[dict[str, str]]:
    encoded = download_url.removeprefix("data:text/csv;base64,")
    csv_text = b64decode(encoded.encode()).decode()
    return list(DictReader(StringIO(csv_text)))


def seed_export_observation(
    client: TestClient,
    *,
    region_code: str,
    privacy_level: PrivacyLevel = PrivacyLevel.public,
) -> str:
    async def seed() -> str:
        session_factory = cast(Any, client.app).state.session_factory
        async with session_factory() as session:
            species = Species(
                scientific_name=f"Fallopia japonica {region_code} {privacy_level.value}",
                common_name=f"Japanese knotweed {region_code} {privacy_level.value}",
            )
            observation = Observation(
                timestamp=datetime(2026, 6, 26, 12, tzinfo=UTC),
                created_at=datetime(2026, 6, 26, 12, tzinfo=UTC),
                updated_at=datetime(2026, 6, 26, 12, tzinfo=UTC),
                latitude=Decimal("40.712800"),
                longitude=Decimal("-74.006000"),
                coordinate_uncertainty_m=Decimal("5.00"),
                region_code=region_code,
                privacy_level=privacy_level,
                habitat_answers={"soil": "wet"},
            )
            session.add_all([species, observation])
            await session.flush()
            session.add_all(
                [
                    AIIdentification(
                        observation_id=observation.id,
                        candidate_species_id=species.id,
                        candidate_scientific_name=species.scientific_name,
                        candidate_common_name=species.common_name,
                        confidence=Decimal("0.9100"),
                        confidence_label=ConfidenceLabel.high,
                        model_name="mock",
                        model_version="0.1",
                    ),
                    EnvironmentalContext(
                        observation_id=observation.id,
                        land_cover_class="urban",
                        tree_canopy_pct=Decimal("30.00"),
                        impervious_surface_pct=Decimal("50.00"),
                        ndvi_value=Decimal("0.5000"),
                        distance_to_water_m=Decimal("100.00"),
                        distance_to_road_m=Decimal("10.00"),
                        distance_to_trail_m=Decimal("20.00"),
                        distance_to_park_m=Decimal("30.00"),
                        enrichment_version="test",
                    ),
                    SignalScore(
                        observation_id=observation.id,
                        identity_confidence=Decimal("91.00"),
                        local_novelty=Decimal("70.00"),
                        habitat_match=Decimal("80.00"),
                        pathway_risk=Decimal("75.00"),
                        nearby_verified_record_context=Decimal("20.00"),
                        ecological_sensitivity=Decimal("70.00"),
                        sampling_gap_value=Decimal("85.00"),
                        temporal_cluster_score=Decimal("15.00"),
                        uncertainty_penalty=Decimal("5.00"),
                        final_signal_priority=Decimal("82.00"),
                        label=SignalScoreLabel.priority_ecological_signal,
                        reasons=[],
                        model_version="test",
                    ),
                    Verification(
                        observation_id=observation.id,
                        status=VerificationStatus.ai_suggested,
                    ),
                    KnownRecord(
                        species_id=species.id,
                        observed_at=datetime(2026, 6, 1, tzinfo=UTC),
                        verification_status=VerificationStatus.expert_verified,
                        source="state_agency",
                        geom="POINT(-74.006 40.713)",
                        latitude=Decimal("40.713000"),
                        longitude=Decimal("-74.006000"),
                    ),
                ]
            )
            await session.commit()
            return str(observation.id)

    return anyio.run(seed)


def test_create_export_record(exports_client: TestClient) -> None:
    requester_id = create_researcher(exports_client)

    response = exports_client.post(
        "/research/exports",
        json={
            "requester_id": requester_id,
            "format": "csv",
            "filters": {"region_code": "NY", "signal_label": "priority_ecological_signal"},
            "license_summary": "Public and obscured records only.",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["requester_id"] == requester_id
    assert body["status"] == "pending"
    assert body["format"] == "csv"
    assert body["filters"]["region_code"] == "NY"


def test_get_and_list_exports(exports_client: TestClient) -> None:
    requester_id = create_researcher(exports_client)
    created = exports_client.post(
        "/research/exports",
        json={"requester_id": requester_id, "format": "geojson", "filters": {"species_id": "abc"}},
    ).json()

    get_response = exports_client.get(f"/research/exports/{created['id']}")
    list_response = exports_client.get("/research/exports", params={"requester_id": requester_id})

    assert get_response.status_code == 200
    assert get_response.json()["id"] == created["id"]
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [created["id"]]


def test_update_export_status(exports_client: TestClient) -> None:
    created = exports_client.post(
        "/research/exports",
        json={"format": "csv", "filters": {"region_code": "PA"}},
    ).json()

    response = exports_client.patch(
        f"/research/exports/{created['id']}",
        json={
            "status": "complete",
            "download_url": "http://localhost:8000/downloads/export.csv",
            "completed_at": "2026-06-26T12:30:00Z",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "complete"
    assert body["download_url"].endswith("export.csv")
    assert body["completed_at"].startswith("2026-06-26T12:30:00")


def test_missing_requester_rejected(exports_client: TestClient) -> None:
    response = exports_client.post(
        "/research/exports",
        json={
            "requester_id": "11111111-1111-1111-1111-111111111111",
            "format": "csv",
            "filters": {},
        },
    )

    assert response.status_code == 404
    assert response.json()["code"] == "requester_not_found"


def test_invalid_export_format_rejected(exports_client: TestClient) -> None:
    response = exports_client.post(
        "/research/exports",
        json={"format": "xlsx", "filters": {}},
    )

    assert response.status_code == 422


def test_research_csv_export_generates_stable_columns(exports_client: TestClient) -> None:
    requester_id = create_researcher(exports_client)
    observation_id = seed_export_observation(exports_client, region_code="NY")

    response = exports_client.post(
        "/research/export",
        json={
            "requester_id": requester_id,
            "format": "csv",
            "filters": {"region_code": "NY"},
            "include_environmental_context": True,
            "include_signal_scores": True,
            "include_verification": True,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "complete"
    rows = decoded_csv_rows(body["download_url"])
    assert rows[0]["observation_id"] == observation_id
    assert rows[0]["scientific_name"].startswith("Fallopia japonica")
    assert rows[0]["verification_status"] == "ai_suggested"
    assert rows[0]["land_cover_class"] == "urban"
    assert rows[0]["final_signal_priority"] == "82.00"
    assert rows[0]["nearby_records_count"] == "1"
    assert list(rows[0].keys()) == [
        "observation_id",
        "scientific_name",
        "common_name",
        "candidate_name",
        "verified_scientific_name",
        "latitude",
        "longitude",
        "coordinate_uncertainty_m",
        "timestamp",
        "source",
        "verification_status",
        "confidence",
        "confidence_label",
        "habitat_answers",
        "land_cover_class",
        "tree_canopy_pct",
        "impervious_surface_pct",
        "ndvi_value",
        "distance_to_water_m",
        "distance_to_road_m",
        "distance_to_trail_m",
        "distance_to_park_m",
        "nearby_records_count",
        "sampling_density_score",
        "final_signal_priority",
        "signal_label",
        "model_version",
        "license_or_consent_status",
    ]


def test_research_csv_export_applies_filters_and_excludes_private_records(
    exports_client: TestClient,
) -> None:
    requester_id = create_researcher(exports_client)
    ny_id = seed_export_observation(exports_client, region_code="NY")
    seed_export_observation(exports_client, region_code="PA")
    seed_export_observation(exports_client, region_code="NY", privacy_level=PrivacyLevel.private)

    response = exports_client.post(
        "/research/export",
        json={
            "requester_id": requester_id,
            "format": "csv",
            "filters": {"region_code": "NY"},
        },
    )

    assert response.status_code == 201
    rows = decoded_csv_rows(response.json()["download_url"])
    assert [row["observation_id"] for row in rows] == [ny_id]


def test_research_csv_export_rejects_consumer(exports_client: TestClient) -> None:
    consumer = exports_client.post(
        "/users",
        json={"email": "consumer@example.com", "role": "consumer"},
    ).json()

    response = exports_client.post(
        "/research/export",
        json={"requester_id": consumer["id"], "format": "csv", "filters": {}},
    )

    assert response.status_code == 403
    assert response.json()["code"] == "research_export_forbidden"
