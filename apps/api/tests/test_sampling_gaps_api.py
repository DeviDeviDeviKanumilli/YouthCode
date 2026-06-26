from collections.abc import AsyncGenerator, Generator
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
from app.models import SamplingGridCell, SamplingLabel, Species


@pytest.fixture
def sampling_gaps_client() -> Generator[TestClient, None, None]:
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


def create_species(client: TestClient) -> str:
    response = client.post(
        "/species",
        json={"scientific_name": "Fallopia japonica", "common_name": "Japanese knotweed"},
    )
    assert response.status_code == 201
    return str(response.json()["id"])


def seed_sampling_cell(
    client: TestClient,
    *,
    region_code: str = "MVP",
    min_latitude: str = "40.000000",
    min_longitude: str = "-75.000000",
    max_latitude: str = "41.000000",
    max_longitude: str = "-74.000000",
    observation_count: int = 0,
    verified_count: int = 0,
    recent_observation_count: int = 0,
    label: SamplingLabel = SamplingLabel.under_sampled,
) -> str:
    async def seed() -> str:
        session_factory = cast(Any, client.app).state.session_factory
        async with session_factory() as session:
            cell = SamplingGridCell(
                region_code=region_code,
                geom=(
                    f"POLYGON(({min_longitude} {min_latitude},"
                    f"{max_longitude} {min_latitude},"
                    f"{max_longitude} {max_latitude},"
                    f"{min_longitude} {max_latitude},"
                    f"{min_longitude} {min_latitude}))"
                ),
                min_latitude=Decimal(min_latitude),
                min_longitude=Decimal(min_longitude),
                max_latitude=Decimal(max_latitude),
                max_longitude=Decimal(max_longitude),
                observation_count=observation_count,
                verified_count=verified_count,
                recent_observation_count=recent_observation_count,
                distance_to_road_m=Decimal("25.00"),
                distance_to_trail_m=None,
                distance_to_park_m=Decimal("80.00"),
                risk_context={"generated_by": "test"},
                sampling_label=label,
            )
            session.add(cell)
            await session.commit()
            return str(cell.id)

    return anyio.run(seed)


def test_sampling_gaps_returns_valid_geojson(sampling_gaps_client: TestClient) -> None:
    species_id = create_species(sampling_gaps_client)
    cell_id = seed_sampling_cell(
        sampling_gaps_client,
        observation_count=6,
        verified_count=3,
        recent_observation_count=2,
        label=SamplingLabel.well_sampled,
    )

    response = sampling_gaps_client.get(
        "/sampling-gaps",
        params={
            "region_code": "MVP",
            "bbox": "-75.5,39.5,-73.5,41.5",
            "species_id": species_id,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "FeatureCollection"
    assert body["metadata"]["feature_count"] == 1
    assert body["metadata"]["species_id"] == species_id
    feature = body["features"][0]
    assert feature["geometry"]["type"] == "Polygon"
    assert feature["geometry"]["coordinates"][0][0] == [-75.0, 40.0]
    assert feature["properties"]["layer"] == "sampling_gap_grid"
    assert feature["properties"]["cell_id"] == cell_id
    assert feature["properties"]["sampling_label"] == "well_sampled"
    assert feature["properties"]["observation_count"] == 6
    assert feature["properties"]["confidence"] == "high"
    assert "verified observations" in feature["properties"]["explanation"]


def test_sampling_gaps_bbox_filters_cells(sampling_gaps_client: TestClient) -> None:
    included_id = seed_sampling_cell(sampling_gaps_client, region_code="MVP")
    seed_sampling_cell(
        sampling_gaps_client,
        region_code="MVP",
        min_latitude="44.000000",
        min_longitude="-70.000000",
        max_latitude="45.000000",
        max_longitude="-69.000000",
    )

    response = sampling_gaps_client.get(
        "/sampling-gaps",
        params={"region_code": "MVP", "bbox": "-75.5,39.5,-73.5,41.5"},
    )

    assert response.status_code == 200
    features = response.json()["features"]
    assert [feature["properties"]["cell_id"] for feature in features] == [included_id]


def test_sampling_gaps_empty_state(sampling_gaps_client: TestClient) -> None:
    response = sampling_gaps_client.get("/sampling-gaps", params={"region_code": "EMPTY"})

    assert response.status_code == 200
    assert response.json()["features"] == []
    assert response.json()["metadata"]["feature_count"] == 0


def test_sampling_gaps_public_and_research_modes(sampling_gaps_client: TestClient) -> None:
    seed_sampling_cell(
        sampling_gaps_client,
        observation_count=2,
        verified_count=1,
        recent_observation_count=2,
        label=SamplingLabel.road_trail_biased,
    )

    public_response = sampling_gaps_client.get(
        "/sampling-gaps",
        params={"region_code": "MVP", "mode": "public"},
    )
    research_response = sampling_gaps_client.get(
        "/sampling-gaps",
        params={"region_code": "MVP", "mode": "research"},
    )

    assert public_response.status_code == 200
    assert research_response.status_code == 200
    public_properties = public_response.json()["features"][0]["properties"]
    research_properties = research_response.json()["features"][0]["properties"]
    assert "verified_count" not in public_properties
    assert public_properties["confidence"] == "medium"
    assert research_properties["verified_count"] == 1
    assert research_properties["recent_observation_count"] == 2
    assert research_properties["risk_context"] == {"generated_by": "test"}


def test_sampling_gaps_rejects_unknown_species(sampling_gaps_client: TestClient) -> None:
    response = sampling_gaps_client.get(
        "/sampling-gaps",
        params={"species_id": str(UUID("00000000-0000-0000-0000-000000000001"))},
    )

    assert response.status_code == 404
    assert response.json()["code"] == "species_not_found"
