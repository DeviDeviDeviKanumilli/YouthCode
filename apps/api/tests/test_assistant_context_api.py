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
    SamplingGridCell,
    SamplingLabel,
    SignalScore,
    SignalScoreLabel,
    Species,
    Verification,
    VerificationStatus,
)


@pytest.fixture
def assistant_context_client() -> Generator[TestClient, None, None]:
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
        cast(Table, Species.__table__),
        cast(Table, Observation.__table__),
        cast(Table, AIIdentification.__table__),
        cast(Table, Media.__table__),
        cast(Table, EnvironmentalContext.__table__),
        cast(Table, SignalScore.__table__),
        cast(Table, Verification.__table__),
        cast(Table, KnownRecord.__table__),
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


def seed_sparse_observation(client: TestClient) -> str:
    async def seed() -> str:
        session_factory = cast(Any, client.app).state.session_factory
        async with session_factory() as session:
            observation = Observation(
                timestamp=datetime(2026, 6, 26, 12, tzinfo=UTC),
                latitude=Decimal("40.712800"),
                longitude=Decimal("-74.006000"),
                region_code="NY",
            )
            session.add(observation)
            await session.commit()
            return str(observation.id)

    return anyio.run(seed)


def seed_rich_observation(client: TestClient) -> str:
    async def seed() -> str:
        session_factory = cast(Any, client.app).state.session_factory
        async with session_factory() as session:
            species = Species(
                scientific_name="Fallopia japonica",
                common_name="Japanese knotweed",
            )
            observation = Observation(
                timestamp=datetime(2026, 6, 26, 12, tzinfo=UTC),
                latitude=Decimal("40.712800"),
                longitude=Decimal("-74.006000"),
                coordinate_uncertainty_m=Decimal("5.00"),
                region_code="NY",
                habitat_answers={"organism_type": "plant"},
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
                        model_name="mock-vision",
                        model_version="0.1.0",
                        similar_species=[{"scientific_name": "Reynoutria sachalinensis"}],
                    ),
                    Media(
                        observation_id=observation.id,
                        file_type=MediaFileType.image,
                        mime_type="image/jpeg",
                        storage_key="evidence/photo.jpg",
                        public_url="https://cdn.example.test/photo.jpg",
                        metadata_removed=True,
                    ),
                    EnvironmentalContext(
                        observation_id=observation.id,
                        land_cover_class="urban",
                        tree_canopy_pct=Decimal("30.00"),
                        impervious_surface_pct=Decimal("50.00"),
                        ndvi_value=Decimal("0.5000"),
                        distance_to_water_m=Decimal("80.00"),
                        distance_to_road_m=Decimal("10.00"),
                        data_sources={"provider": "test"},
                        enrichment_version="test-0.1.0",
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
                        reasons=[{"code": "test_reason"}],
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
                    SamplingGridCell(
                        region_code="NY",
                        geom="POLYGON((-74.1 40.7,-73.9 40.7,-73.9 40.8,-74.1 40.8,-74.1 40.7))",
                        min_latitude=Decimal("40.700000"),
                        min_longitude=Decimal("-74.100000"),
                        max_latitude=Decimal("40.800000"),
                        max_longitude=Decimal("-73.900000"),
                        observation_count=1,
                        verified_count=0,
                        recent_observation_count=1,
                        risk_context={},
                        sampling_label=SamplingLabel.high_risk_under_sampled,
                    ),
                ]
            )
            await session.commit()
            return str(observation.id)

    return anyio.run(seed)


def test_observation_assistant_context_includes_only_database_facts(
    assistant_context_client: TestClient,
) -> None:
    observation_id = seed_rich_observation(assistant_context_client)

    response = assistant_context_client.get(
        f"/assistant/context/observation/{observation_id}",
    )

    assert response.status_code == 200
    body = response.json()
    assert body["observation_id"] == observation_id
    assert body["observation"]["region_code"] == "NY"
    assert body["media_metadata"][0]["storage_key"] == "evidence/photo.jpg"
    assert body["latest_identification"]["candidate_scientific_name"] == "Fallopia japonica"
    assert body["environmental_context"]["land_cover_class"] == "urban"
    assert body["signal_score"]["signal_label"] == "priority_ecological_signal"
    assert body["verification_status"] == "ai_suggested"
    assert body["nearby_records_summary"]["record_count"] == 1
    assert body["sampling_gap_context"]["sampling_label"] == "high_risk_under_sampled"
    assert "nearby_records" in body["data_sources_used"]
    assert "sampling_grid" in body["data_sources_used"]
    flattened = " ".join(str(value) for value in body.values()).lower()
    assert "chemical" not in flattened
    assert "is a confirmed identification" not in flattened
    assert "confirmed invasion" not in flattened


def test_observation_assistant_context_marks_missing_fields_unknown(
    assistant_context_client: TestClient,
) -> None:
    observation_id = seed_sparse_observation(assistant_context_client)

    response = assistant_context_client.get(
        f"/assistant/context/observation/{observation_id}",
    )

    assert response.status_code == 200
    body = response.json()
    assert body["latest_identification"] == "unknown"
    assert body["environmental_context"] == "unknown"
    assert body["signal_score"] == "unknown"
    assert body["nearby_records_summary"] == "unknown"
    assert body["sampling_gap_context"] == "unknown"
    assert body["verification_status"] == "raw"
    assert any("insufficient evidence" in claim for claim in body["allowed_claims"])
    assert "not a confirmed identification" in body["required_uncertainty_notice"]


def test_observation_assistant_context_allows_stronger_verified_claims(
    assistant_context_client: TestClient,
) -> None:
    observation_id = seed_rich_observation(assistant_context_client)

    async def verify() -> None:
        session_factory = cast(Any, assistant_context_client.app).state.session_factory
        async with session_factory() as session:
            verification = await session.get(Verification, observation_id)
            assert verification is not None
            verification.status = VerificationStatus.expert_verified
            await session.commit()

    anyio.run(verify)

    response = assistant_context_client.get(
        f"/assistant/context/observation/{observation_id}",
    )

    assert response.status_code == 200
    body = response.json()
    assert body["verification_status"] == "expert_verified"
    assert any("verified status" in claim for claim in body["allowed_claims"])
    assert "verification support" in body["required_uncertainty_notice"]
