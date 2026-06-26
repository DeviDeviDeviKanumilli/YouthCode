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
from app.models import KnownRecord, Observation, Species, User, VerificationStatus


@pytest.fixture
def nearby_records_client() -> Generator[TestClient, None, None]:
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


def create_species(client: TestClient, scientific_name: str, common_name: str) -> str:
    response = client.post(
        "/species",
        json={"scientific_name": scientific_name, "common_name": common_name},
    )
    assert response.status_code == 201
    return str(response.json()["id"])


def seed_known_records(
    client: TestClient,
    species_id: str,
    other_species_id: str,
) -> None:
    async def seed() -> None:
        session_factory = cast(Any, client.app).state.session_factory
        async with session_factory() as session:
            session.add_all(
                [
                    KnownRecord(
                        species_id=UUID(species_id),
                        observed_at=datetime(2026, 6, 1, tzinfo=UTC),
                        verification_status=VerificationStatus.expert_verified,
                        source="state_agency",
                        geom="POINT(-74.006 40.713)",
                        latitude=Decimal("40.713000"),
                        longitude=Decimal("-74.006000"),
                    ),
                    KnownRecord(
                        species_id=UUID(species_id),
                        observed_at=datetime(2026, 6, 2, tzinfo=UTC),
                        verification_status=VerificationStatus.ai_suggested,
                        source="community_import",
                        geom="POINT(-74.006 40.713)",
                        latitude=Decimal("40.713000"),
                        longitude=Decimal("-74.006000"),
                    ),
                    KnownRecord(
                        species_id=UUID(other_species_id),
                        observed_at=datetime(2026, 6, 3, tzinfo=UTC),
                        verification_status=VerificationStatus.field_confirmed,
                        source="partner_dataset",
                        geom="POINT(-74.006 40.713)",
                        latitude=Decimal("40.713000"),
                        longitude=Decimal("-74.006000"),
                    ),
                    KnownRecord(
                        species_id=UUID(species_id),
                        observed_at=datetime(2026, 6, 4, tzinfo=UTC),
                        verification_status=VerificationStatus.expert_verified,
                        source="state_agency",
                        geom="POINT(-75.000 41.000)",
                        latitude=Decimal("41.000000"),
                        longitude=Decimal("-75.000000"),
                    ),
                ]
            )
            await session.commit()

    import anyio

    anyio.run(seed)


def test_nearby_records_summary_counts_records(nearby_records_client: TestClient) -> None:
    observation_id = create_observation(nearby_records_client)
    species_id = create_species(
        nearby_records_client,
        "Fallopia japonica",
        "Japanese knotweed",
    )
    other_species_id = create_species(
        nearby_records_client,
        "Lythrum salicaria",
        "Purple loosestrife",
    )
    seed_known_records(nearby_records_client, species_id, other_species_id)

    response = nearby_records_client.get(
        f"/observations/{observation_id}/nearby-records",
        params={"radius_km": "1"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["record_count"] == 3
    assert Decimal(body["nearest_distance_m"]) < Decimal("30")
    assert body["verified_count"] == 2
    assert body["unverified_count"] == 1
    assert body["sources"] == ["community_import", "partner_dataset", "state_agency"]


def test_nearby_records_radius_filter(nearby_records_client: TestClient) -> None:
    observation_id = create_observation(nearby_records_client)
    species_id = create_species(nearby_records_client, "Trapa natans", "Water chestnut")
    other_species_id = create_species(
        nearby_records_client,
        "Agrilus planipennis",
        "Emerald ash borer",
    )
    seed_known_records(nearby_records_client, species_id, other_species_id)

    response = nearby_records_client.get(
        f"/observations/{observation_id}/nearby-records",
        params={"radius_km": "0.01"},
    )

    assert response.status_code == 200
    assert response.json()["record_count"] == 0
    assert response.json()["nearest_distance_m"] is None


def test_nearby_records_species_filter(nearby_records_client: TestClient) -> None:
    observation_id = create_observation(nearby_records_client)
    species_id = create_species(
        nearby_records_client,
        "Lycorma delicatula",
        "Spotted lanternfly",
    )
    other_species_id = create_species(
        nearby_records_client,
        "Lythrum salicaria",
        "Purple loosestrife",
    )
    seed_known_records(nearby_records_client, species_id, other_species_id)

    response = nearby_records_client.get(
        f"/observations/{observation_id}/nearby-records",
        params={"radius_km": "1", "species_id": species_id},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["record_count"] == 2
    assert {record["species_id"] for record in body["records"]} == {species_id}
    assert body["verified_count"] == 1
    assert body["unverified_count"] == 1


def test_nearby_records_missing_species_rejected(nearby_records_client: TestClient) -> None:
    observation_id = create_observation(nearby_records_client)

    response = nearby_records_client.get(
        f"/observations/{observation_id}/nearby-records",
        params={"species_id": "11111111-1111-1111-1111-111111111111"},
    )

    assert response.status_code == 404
    assert response.json()["code"] == "species_not_found"
