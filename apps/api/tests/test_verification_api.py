from collections.abc import AsyncGenerator, Generator
from datetime import UTC, datetime
from decimal import Decimal
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
    KnownRecord,
    Media,
    MediaFileType,
    Observation,
    SignalScore,
    SignalScoreLabel,
    Species,
    User,
    Verification,
    VerificationStatus,
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
        cast(Table, Media.__table__),
        cast(Table, EnvironmentalContext.__table__),
        cast(Table, SignalScore.__table__),
        cast(Table, Verification.__table__),
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
    assert body["reviewed_at"] is not None


def test_researcher_can_expert_verify(verification_client: TestClient) -> None:
    observation_id = create_observation(verification_client)
    researcher_id = create_user(verification_client, "researcher")
    species_id = create_species(verification_client)

    response = verification_client.post(
        f"/verification/{observation_id}",
        json={
            "status": "expert_verified",
            "reviewer_id": researcher_id,
            "verified_species_id": species_id,
            "review_notes": "Research review supports this identification.",
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "expert_verified"
    assert response.json()["reviewer_type"] == "researcher"


def test_researcher_cannot_field_confirm(verification_client: TestClient) -> None:
    observation_id = create_observation(verification_client)
    researcher_id = create_user(verification_client, "researcher")
    species_id = create_species(verification_client)

    response = verification_client.post(
        f"/verification/{observation_id}",
        json={
            "status": "field_confirmed",
            "reviewer_id": researcher_id,
            "verified_species_id": species_id,
            "review_notes": "Saw it in the field.",
        },
    )

    assert response.status_code == 403
    assert response.json()["code"] == "verification_forbidden"


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

    response = verification_client.get(
        "/research/verification-queue",
        params={"requester_id": reviewer_id},
    )

    assert response.status_code == 200
    assert response.json()[0]["observation_id"] == observation_id
    assert response.json()[0]["verification_status"] == "needs_more_evidence"


def seed_queue_record(
    client: TestClient,
    *,
    status: VerificationStatus,
    signal_label: SignalScoreLabel,
    priority: str,
    created_at: datetime,
) -> str:
    async def seed() -> str:
        session_factory = cast(Any, client.app).state.session_factory
        async with session_factory() as session:
            species = Species(
                scientific_name=f"Species {created_at.timestamp()}",
                common_name=f"Common {created_at.timestamp()}",
            )
            observation = Observation(
                timestamp=created_at,
                created_at=created_at,
                updated_at=created_at,
                latitude=Decimal("40.712800"),
                longitude=Decimal("-74.006000"),
                region_code="NY",
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
                        confidence=Decimal("0.9000"),
                        confidence_label=ConfidenceLabel.high,
                        model_name="mock",
                        model_version="0.1",
                    ),
                    Media(
                        observation_id=observation.id,
                        file_type=MediaFileType.image,
                        mime_type="image/jpeg",
                        storage_key=f"{observation.id}.jpg",
                        public_url=f"https://cdn.example.test/{observation.id}.jpg",
                    ),
                    EnvironmentalContext(
                        observation_id=observation.id,
                        land_cover_class="urban",
                        tree_canopy_pct=Decimal("30.00"),
                        impervious_surface_pct=Decimal("50.00"),
                        distance_to_water_m=Decimal("100.00"),
                        distance_to_road_m=Decimal("10.00"),
                        enrichment_version="test",
                    ),
                    KnownRecord(
                        species_id=species.id,
                        observed_at=created_at,
                        verification_status=VerificationStatus.expert_verified,
                        source="state_agency",
                        geom="POINT(-74.006 40.713)",
                        latitude=Decimal("40.713000"),
                        longitude=Decimal("-74.006000"),
                    ),
                    SignalScore(
                        observation_id=observation.id,
                        identity_confidence=Decimal("90.00"),
                        local_novelty=Decimal("70.00"),
                        habitat_match=Decimal("80.00"),
                        pathway_risk=Decimal("75.00"),
                        nearby_verified_record_context=Decimal("20.00"),
                        ecological_sensitivity=Decimal("70.00"),
                        sampling_gap_value=Decimal("85.00"),
                        temporal_cluster_score=Decimal("15.00"),
                        uncertainty_penalty=Decimal("5.00"),
                        final_signal_priority=Decimal(priority),
                        label=signal_label,
                        reasons=[],
                        model_version="test",
                    ),
                    Verification(observation_id=observation.id, status=status),
                ]
            )
            await session.commit()
            return str(observation.id)

    return anyio.run(seed)


def test_research_verification_queue_order_and_enriched_payload(
    verification_client: TestClient,
) -> None:
    requester_id = create_user(verification_client, "researcher")
    low_new = seed_queue_record(
        verification_client,
        status=VerificationStatus.raw,
        signal_label=SignalScoreLabel.moderate_signal,
        priority="35.00",
        created_at=datetime(2026, 6, 26, 12, tzinfo=UTC),
    )
    priority_old = seed_queue_record(
        verification_client,
        status=VerificationStatus.raw,
        signal_label=SignalScoreLabel.priority_ecological_signal,
        priority="90.00",
        created_at=datetime(2026, 6, 20, 12, tzinfo=UTC),
    )
    high_value = seed_queue_record(
        verification_client,
        status=VerificationStatus.ai_suggested,
        signal_label=SignalScoreLabel.high_value_verification_candidate,
        priority="70.00",
        created_at=datetime(2026, 6, 25, 12, tzinfo=UTC),
    )

    response = verification_client.get(
        "/research/verification-queue",
        params={"requester_id": requester_id},
    )

    assert response.status_code == 200
    body = response.json()
    assert [item["observation_id"] for item in body] == [priority_old, high_value, low_new]
    first = body[0]
    assert first["media"][0]["public_url"].startswith("https://cdn.example.test/")
    assert first["latest_identification"]["confidence"] == "0.9000"
    assert first["environmental_context"]["land_cover_class"] == "urban"
    assert first["signal_score"]["final_signal_priority"] == "90.00"
    assert first["nearby_records"]["record_count"] == 1


def test_research_verification_queue_excludes_resolved_by_default(
    verification_client: TestClient,
) -> None:
    requester_id = create_user(verification_client, "admin")
    resolved_id = seed_queue_record(
        verification_client,
        status=VerificationStatus.expert_verified,
        signal_label=SignalScoreLabel.priority_ecological_signal,
        priority="95.00",
        created_at=datetime(2026, 6, 26, 12, tzinfo=UTC),
    )

    default_response = verification_client.get(
        "/research/verification-queue",
        params={"requester_id": requester_id},
    )
    included_response = verification_client.get(
        "/research/verification-queue",
        params={"requester_id": requester_id, "include_resolved": True},
    )

    assert default_response.status_code == 200
    assert default_response.json() == []
    assert included_response.status_code == 200
    assert included_response.json()[0]["observation_id"] == resolved_id


def test_research_verification_queue_rejects_consumer(
    verification_client: TestClient,
) -> None:
    requester_id = create_user(verification_client, "consumer")

    response = verification_client.get(
        "/research/verification-queue",
        params={"requester_id": requester_id},
    )

    assert response.status_code == 403
    assert response.json()["code"] == "verification_queue_forbidden"
