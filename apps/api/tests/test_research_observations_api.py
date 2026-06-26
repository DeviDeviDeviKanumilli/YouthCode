from collections.abc import AsyncGenerator, Generator
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any, cast
from uuid import UUID

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
    Media,
    MediaFileType,
    Observation,
    PrivacyLevel,
    SamplingGridCell,
    SamplingLabel,
    SignalScore,
    SignalScoreLabel,
    Species,
    User,
    UserRole,
    Verification,
    VerificationStatus,
)


@pytest.fixture
def research_observations_client() -> Generator[TestClient, None, None]:
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
        cast(Table, SignalScore.__table__),
        cast(Table, Verification.__table__),
        cast(Table, SamplingGridCell.__table__),
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

    anyio.run(create_tables)
    app = create_app()
    app.state.session_factory = session_factory
    app.dependency_overrides[get_async_session] = override_session

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    anyio.run(drop_tables)


@dataclass(frozen=True)
class ResearchSeed:
    researcher_id: str
    consumer_id: str
    target_species_id: str
    other_species_id: str
    target_observation_id: str
    other_observation_id: str
    older_observation_id: str


def seed_research_dataset(client: TestClient) -> ResearchSeed:
    async def seed() -> ResearchSeed:
        session_factory = cast(Any, client.app).state.session_factory
        async with session_factory() as session:
            researcher = User(email="researcher@example.com", role=UserRole.researcher)
            consumer = User(email="consumer@example.com", role=UserRole.consumer)
            target_species = Species(
                scientific_name="Fallopia japonica",
                common_name="Japanese knotweed",
            )
            other_species = Species(
                scientific_name="Lythrum salicaria",
                common_name="Purple loosestrife",
            )
            session.add_all([researcher, consumer, target_species, other_species])
            await session.flush()

            target = Observation(
                timestamp=datetime(2026, 6, 20, 12, tzinfo=UTC),
                created_at=datetime(2026, 6, 20, 12, tzinfo=UTC),
                updated_at=datetime(2026, 6, 20, 12, tzinfo=UTC),
                latitude=Decimal("40.500000"),
                longitude=Decimal("-74.500000"),
                region_code="MVP",
                privacy_level=PrivacyLevel.public,
            )
            other = Observation(
                timestamp=datetime(2026, 6, 21, 12, tzinfo=UTC),
                created_at=datetime(2026, 6, 21, 12, tzinfo=UTC),
                updated_at=datetime(2026, 6, 21, 12, tzinfo=UTC),
                latitude=Decimal("41.500000"),
                longitude=Decimal("-73.500000"),
                region_code="OTHER",
                privacy_level=PrivacyLevel.obscured,
            )
            older = Observation(
                timestamp=datetime(2026, 5, 5, 12, tzinfo=UTC),
                created_at=datetime(2026, 5, 5, 12, tzinfo=UTC),
                updated_at=datetime(2026, 5, 5, 12, tzinfo=UTC),
                latitude=Decimal("40.600000"),
                longitude=Decimal("-74.600000"),
                region_code="MVP",
                privacy_level=PrivacyLevel.private,
            )
            session.add_all([target, other, older])
            await session.flush()

            session.add_all(
                [
                    AIIdentification(
                        observation_id=target.id,
                        candidate_species_id=target_species.id,
                        candidate_scientific_name="Fallopia japonica",
                        candidate_common_name="Japanese knotweed",
                        confidence=Decimal("0.9100"),
                        confidence_label=ConfidenceLabel.high,
                        model_name="mock",
                        model_version="0.1",
                        needs_verification=True,
                    ),
                    AIIdentification(
                        observation_id=other.id,
                        candidate_species_id=other_species.id,
                        candidate_scientific_name="Lythrum salicaria",
                        candidate_common_name="Purple loosestrife",
                        confidence=Decimal("0.7200"),
                        confidence_label=ConfidenceLabel.medium_high,
                        model_name="mock",
                        model_version="0.1",
                        needs_verification=False,
                    ),
                    AIIdentification(
                        observation_id=older.id,
                        candidate_species_id=target_species.id,
                        candidate_scientific_name="Fallopia japonica",
                        candidate_common_name="Japanese knotweed",
                        confidence=Decimal("0.5100"),
                        confidence_label=ConfidenceLabel.medium,
                        model_name="mock",
                        model_version="0.1",
                        needs_verification=True,
                    ),
                    Media(
                        observation_id=target.id,
                        file_type=MediaFileType.image,
                        mime_type="image/jpeg",
                        storage_key="target.jpg",
                        public_url="https://cdn.example.test/target.jpg",
                    ),
                    SignalScore(
                        observation_id=target.id,
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
                    SignalScore(
                        observation_id=other.id,
                        identity_confidence=Decimal("72.00"),
                        local_novelty=Decimal("40.00"),
                        habitat_match=Decimal("45.00"),
                        pathway_risk=Decimal("30.00"),
                        nearby_verified_record_context=Decimal("10.00"),
                        ecological_sensitivity=Decimal("40.00"),
                        sampling_gap_value=Decimal("20.00"),
                        temporal_cluster_score=Decimal("5.00"),
                        uncertainty_penalty=Decimal("15.00"),
                        final_signal_priority=Decimal("35.00"),
                        label=SignalScoreLabel.moderate_signal,
                        reasons=[],
                        model_version="test",
                    ),
                    SignalScore(
                        observation_id=older.id,
                        identity_confidence=Decimal("51.00"),
                        local_novelty=Decimal("20.00"),
                        habitat_match=Decimal("25.00"),
                        pathway_risk=Decimal("25.00"),
                        nearby_verified_record_context=Decimal("5.00"),
                        ecological_sensitivity=Decimal("30.00"),
                        sampling_gap_value=Decimal("60.00"),
                        temporal_cluster_score=Decimal("1.00"),
                        uncertainty_penalty=Decimal("20.00"),
                        final_signal_priority=Decimal("28.00"),
                        label=SignalScoreLabel.low_signal,
                        reasons=[],
                        model_version="test",
                    ),
                    Verification(
                        observation_id=target.id,
                        status=VerificationStatus.ai_suggested,
                    ),
                    Verification(
                        observation_id=other.id,
                        status=VerificationStatus.expert_verified,
                    ),
                    Verification(
                        observation_id=older.id,
                        status=VerificationStatus.needs_more_evidence,
                    ),
                    SamplingGridCell(
                        region_code="MVP",
                        geom=(
                            "POLYGON((-75 40,-74 40,-74 41,-75 41,-75 40))"
                        ),
                        min_latitude=Decimal("40.000000"),
                        min_longitude=Decimal("-75.000000"),
                        max_latitude=Decimal("41.000000"),
                        max_longitude=Decimal("-74.000000"),
                        observation_count=1,
                        verified_count=0,
                        recent_observation_count=1,
                        risk_context={},
                        sampling_label=SamplingLabel.high_risk_under_sampled,
                    ),
                ]
            )
            await session.commit()
            return ResearchSeed(
                researcher_id=str(researcher.id),
                consumer_id=str(consumer.id),
                target_species_id=str(target_species.id),
                other_species_id=str(other_species.id),
                target_observation_id=str(target.id),
                other_observation_id=str(other.id),
                older_observation_id=str(older.id),
            )

    return anyio.run(seed)


def search(client: TestClient, seed: ResearchSeed, **params: str | int | bool) -> dict[str, Any]:
    response = client.get(
        "/research/observations",
        params={"requester_id": seed.researcher_id, **params},
    )
    assert response.status_code == 200
    return cast(dict[str, Any], response.json())


def ids(body: dict[str, Any]) -> list[str]:
    return [item["observation_id"] for item in body["items"]]


def test_research_observation_search_returns_dashboard_rows(
    research_observations_client: TestClient,
) -> None:
    seed = seed_research_dataset(research_observations_client)

    body = search(research_observations_client, seed)

    assert body["total"] == 3
    assert body["limit"] == 50
    first = body["items"][0]
    assert first["observation_id"] == seed.other_observation_id
    target = next(
        item for item in body["items"] if item["observation_id"] == seed.target_observation_id
    )
    assert target["photo_thumbnail_url"] == "https://cdn.example.test/target.jpg"
    assert target["candidate_species"] == "Japanese knotweed"
    assert target["confidence"] == "0.9100"
    assert target["signal_score"] == "82.00"
    assert target["verification_status"] == "ai_suggested"
    assert target["location_summary"]["region_code"] == "MVP"


def test_research_observation_search_filters_species_candidate_status_and_signal(
    research_observations_client: TestClient,
) -> None:
    seed = seed_research_dataset(research_observations_client)

    assert ids(search(research_observations_client, seed, species_id=seed.target_species_id)) == [
        seed.target_observation_id,
        seed.older_observation_id,
    ]
    assert ids(search(research_observations_client, seed, candidate_name="loosestrife")) == [
        seed.other_observation_id
    ]
    assert ids(
        search(
            research_observations_client,
            seed,
            verification_status="needs_more_evidence",
        )
    ) == [seed.older_observation_id]
    assert ids(
        search(
            research_observations_client,
            seed,
            signal_label="priority_ecological_signal",
        )
    ) == [seed.target_observation_id]


def test_research_observation_search_filters_score_bbox_region_dates_media_review_and_sampling(
    research_observations_client: TestClient,
) -> None:
    seed = seed_research_dataset(research_observations_client)

    assert ids(search(research_observations_client, seed, min_signal_score="80")) == [
        seed.target_observation_id
    ]
    assert ids(search(research_observations_client, seed, max_signal_score="30")) == [
        seed.older_observation_id
    ]
    assert ids(search(research_observations_client, seed, bbox="-75,40,-74,41")) == [
        seed.target_observation_id,
        seed.older_observation_id,
    ]
    assert ids(search(research_observations_client, seed, region_code="OTHER")) == [
        seed.other_observation_id
    ]
    assert ids(
        search(
            research_observations_client,
            seed,
            from_date="2026-06-01T00:00:00Z",
            to_date="2026-06-30T00:00:00Z",
        )
    ) == [seed.other_observation_id, seed.target_observation_id]
    assert ids(search(research_observations_client, seed, has_media=True)) == [
        seed.target_observation_id
    ]
    assert ids(search(research_observations_client, seed, needs_review=False)) == [
        seed.other_observation_id
    ]
    assert ids(
        search(
            research_observations_client,
            seed,
            sampling_label="high_risk_under_sampled",
        )
    ) == [seed.target_observation_id, seed.older_observation_id]


def test_research_observation_search_paginates_and_sorts(
    research_observations_client: TestClient,
) -> None:
    seed = seed_research_dataset(research_observations_client)

    page = search(research_observations_client, seed, limit=1, offset=1, sort="signal_score_desc")

    assert page["total"] == 3
    assert page["limit"] == 1
    assert page["offset"] == 1
    assert page["sort"] == "signal_score_desc"
    assert ids(page) == [seed.other_observation_id]


def test_research_observation_search_rejects_unauthorized_roles(
    research_observations_client: TestClient,
) -> None:
    seed = seed_research_dataset(research_observations_client)

    response = research_observations_client.get(
        "/research/observations",
        params={"requester_id": seed.consumer_id},
    )

    assert response.status_code == 403
    assert response.json()["code"] == "research_observations_forbidden"


def test_research_observation_search_rejects_unknown_requester(
    research_observations_client: TestClient,
) -> None:
    response = research_observations_client.get(
        "/research/observations",
        params={"requester_id": str(UUID("00000000-0000-0000-0000-000000000001"))},
    )

    assert response.status_code == 404
    assert response.json()["code"] == "requester_not_found"
