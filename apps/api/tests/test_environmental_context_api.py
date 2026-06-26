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
    EnvironmentalContext,
    Observation,
    RoadTrailType,
    StaticPark,
    StaticRoadTrail,
    StaticWaterway,
    User,
)


@pytest.fixture
def environmental_context_client() -> Generator[TestClient, None, None]:
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
        cast(Table, Observation.__table__),
        cast(Table, StaticWaterway.__table__),
        cast(Table, StaticRoadTrail.__table__),
        cast(Table, StaticPark.__table__),
        cast(Table, EnvironmentalContext.__table__),
    ]

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    async def create_tables() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all, tables=tables)
        async with session_factory() as session:
            session.add_all(
                [
                    StaticWaterway(
                        name="Demo Creek",
                        geom="MULTILINESTRING((-74.006 40.713,-74.005 40.714))",
                        representative_latitude=Decimal("40.713000"),
                        representative_longitude=Decimal("-74.006000"),
                        source="demo_static_waterways",
                    ),
                    StaticRoadTrail(
                        name="Demo Road",
                        type=RoadTrailType.road,
                        geom="MULTILINESTRING((-74.006 40.713,-74.010 40.713))",
                        representative_latitude=Decimal("40.713000"),
                        representative_longitude=Decimal("-74.007000"),
                        source="demo_static_roads",
                    ),
                    StaticRoadTrail(
                        name="Demo Trail",
                        type=RoadTrailType.trail,
                        geom="MULTILINESTRING((-74.004 40.713,-74.004 40.714))",
                        representative_latitude=Decimal("40.713000"),
                        representative_longitude=Decimal("-74.004000"),
                        source="demo_static_trails",
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
                        source="demo_static_parks",
                    ),
                ]
            )
            await session.commit()

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


def test_store_environmental_context(environmental_context_client: TestClient) -> None:
    observation_id = create_observation(environmental_context_client)

    response = environmental_context_client.post(
        f"/observations/{observation_id}/environmental-context",
        json={
            "land_cover_class": "developed_open_space",
            "tree_canopy_pct": "42.5",
            "impervious_surface_pct": "18.2",
            "ndvi_value": "0.5123",
            "distance_to_water_m": "76.3",
            "distance_to_road_m": "20.0",
            "data_sources": {"land_cover": "mock-nlcd"},
            "enrichment_version": "manual-test-0.1.0",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["observation_id"] == observation_id
    assert body["land_cover_class"] == "developed_open_space"
    assert body["data_sources"] == {"land_cover": "mock-nlcd"}


def test_get_environmental_context(environmental_context_client: TestClient) -> None:
    observation_id = create_observation(environmental_context_client)
    environmental_context_client.post(
        f"/observations/{observation_id}/environmental-context",
        json={"data_sources": {"provider": "test"}, "enrichment_version": "v1"},
    )

    response = environmental_context_client.get(
        f"/observations/{observation_id}/environmental-context"
    )

    assert response.status_code == 200
    assert response.json()["enrichment_version"] == "v1"


def test_recompute_placeholder_context(environmental_context_client: TestClient) -> None:
    observation_id = create_observation(environmental_context_client)

    response = environmental_context_client.post(
        f"/observations/{observation_id}/environmental-context/recompute"
    )

    assert response.status_code == 200
    body = response.json()
    assert body["enrichment_version"] == "mock-0.2.0"
    assert body["data_sources"]["provider"] == "mock_enrichment"
    assert "distance_to_water_m" in body["data_sources"]["fields"]


def test_enrich_observation_creates_static_context(
    environmental_context_client: TestClient,
) -> None:
    observation_id = create_observation(environmental_context_client)

    response = environmental_context_client.post(f"/observations/{observation_id}/enrich")

    assert response.status_code == 200
    body = response.json()
    assert body["observation_id"] == observation_id
    assert body["enrichment_version"] == "static-demo-0.1.0"
    assert Decimal(body["distance_to_water_m"]) < Decimal("30")
    assert body["data_sources"]["provider"] == "static_geo_data"
    assert body["data_sources"]["fields"]["distance_to_water_m"] == "demo_static_waterways"
    assert body["data_sources"]["static_layers"]["distance_to_park_m"]["name"] == "Demo Park"


def test_enrich_observation_updates_existing_context(
    environmental_context_client: TestClient,
) -> None:
    observation_id = create_observation(environmental_context_client)
    environmental_context_client.post(
        f"/observations/{observation_id}/environmental-context",
        json={"land_cover_class": "forest", "enrichment_version": "manual-v1"},
    )

    response = environmental_context_client.post(f"/observations/{observation_id}/enrich")

    assert response.status_code == 200
    body = response.json()
    assert body["land_cover_class"] == "developed_open_space"
    assert body["enrichment_version"] == "static-demo-0.1.0"


def test_upsert_environmental_context(environmental_context_client: TestClient) -> None:
    observation_id = create_observation(environmental_context_client)
    url = f"/observations/{observation_id}/environmental-context"
    environmental_context_client.post(
        url,
        json={"land_cover_class": "forest", "enrichment_version": "v1"},
    )

    response = environmental_context_client.post(
        url,
        json={"land_cover_class": "wetland", "enrichment_version": "v2"},
    )

    assert response.status_code == 201
    assert response.json()["land_cover_class"] == "wetland"
    assert response.json()["enrichment_version"] == "v2"


def test_missing_observation_rejected(environmental_context_client: TestClient) -> None:
    response = environmental_context_client.post(
        "/observations/11111111-1111-1111-1111-111111111111/environmental-context/recompute"
    )

    assert response.status_code == 404
    assert response.json()["code"] == "observation_not_found"


def test_enrich_missing_observation_rejected(environmental_context_client: TestClient) -> None:
    response = environmental_context_client.post(
        "/observations/11111111-1111-1111-1111-111111111111/enrich"
    )

    assert response.status_code == 404
    assert response.json()["code"] == "observation_not_found"
