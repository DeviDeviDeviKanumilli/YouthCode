from collections.abc import AsyncGenerator, Generator
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import cast

import anyio
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Table, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_async_session
from app.main import create_app
from app.models import (
    AIIdentification,
    EnvironmentalContext,
    KnownRecord,
    Observation,
    SamplingGridCell,
    SignalScore,
    Species,
    SpeciesWatchProfile,
    StaticPark,
    StaticRoadTrail,
    StaticWaterway,
    Verification,
    WatchAssetImage,
    WatchResponseCache,
)
from app.scripts.seed import seed_demo_region, seed_watch_data

WATCH_TABLES: list[Table] = [
    cast(Table, Species.__table__),
    cast(Table, Observation.__table__),
    cast(Table, AIIdentification.__table__),
    cast(Table, EnvironmentalContext.__table__),
    cast(Table, SignalScore.__table__),
    cast(Table, Verification.__table__),
    cast(Table, StaticWaterway.__table__),
    cast(Table, StaticRoadTrail.__table__),
    cast(Table, StaticPark.__table__),
    cast(Table, KnownRecord.__table__),
    cast(Table, SamplingGridCell.__table__),
    cast(Table, SpeciesWatchProfile.__table__),
    cast(Table, WatchAssetImage.__table__),
    cast(Table, WatchResponseCache.__table__),
]


@pytest.fixture
def watch_client() -> Generator[TestClient, None, None]:
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

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    async def setup_database() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all, tables=WATCH_TABLES)
        async with session_factory() as session:
            await seed_watch_data(session)
            await seed_demo_region(session)

    async def drop_database() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all, tables=list(reversed(WATCH_TABLES)))
        await engine.dispose()

    anyio.run(setup_database)
    app = create_app()
    app.state.session_factory = session_factory
    app.dependency_overrides[get_async_session] = override_session

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    anyio.run(drop_database)


@pytest.fixture
async def watch_session() -> AsyncGenerator[AsyncSession, None]:
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
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all, tables=WATCH_TABLES)
    async with session_factory() as session:
        await seed_watch_data(session)
        await seed_demo_region(session)
        yield session
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all, tables=list(reversed(WATCH_TABLES)))
    await engine.dispose()


def test_consumer_watch_returns_cards_and_places(watch_client: TestClient) -> None:
    response = watch_client.get(
        "/consumer/watch",
        params={"lat": "40.714", "lon": "-74.006", "radius_km": "5"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["region"]["radiusKm"] == 5.0
    assert body["updatedAt"]
    assert body["watchedNearYou"]
    assert body["goodPlacesToCheck"]
    assert {"Creek edges", "Park boundaries"}.issubset(
        {place["title"] for place in body["goodPlacesToCheck"]}
    )


def test_consumer_watch_validates_location_and_radius(watch_client: TestClient) -> None:
    invalid_lat = watch_client.get(
        "/consumer/watch",
        params={"lat": "100", "lon": "-74.006", "radius_km": "5"},
    )
    invalid_radius = watch_client.get(
        "/consumer/watch",
        params={"lat": "40.714", "lon": "-74.006", "radius_km": "26"},
    )

    assert invalid_lat.status_code == 422
    assert invalid_radius.status_code == 422


def test_watch_ranking_uses_recent_seasonal_and_habitat_evidence(
    watch_client: TestClient,
) -> None:
    response = watch_client.get(
        "/consumer/watch",
        params={"lat": "40.714", "lon": "-74.006", "radius_km": "5"},
    )

    items = response.json()["watchedNearYou"]
    knotweed = next(item for item in items if item["title"] == "Japanese knotweed")
    assert "Recent" in knotweed["chips"]
    assert knotweed["evidence"]["recentObservationCount"] == 1
    assert knotweed["evidence"]["currentMonthRelevant"] is True
    assert "water" in knotweed["evidence"]["habitatMatches"]
    assert knotweed["priority"] >= 75


def test_watch_generates_trail_and_street_tree_cards(watch_client: TestClient) -> None:
    response = watch_client.get(
        "/consumer/watch",
        params={"lat": "40.714", "lon": "-74.006", "radius_km": "5"},
    )

    places = {place["type"]: place for place in response.json()["goodPlacesToCheck"]}
    assert "trail_entrances" in places
    assert "street_trees" in places
    assert places["street_trees"]["nextAction"]["type"] == "start_report_with_place_context"


def test_watch_copy_avoids_overclaiming_language(watch_client: TestClient) -> None:
    response = watch_client.get(
        "/consumer/watch",
        params={"lat": "40.714", "lon": "-74.006", "radius_km": "5"},
    )

    payload = str(response.json()).lower()
    for banned in [
        "confirmed invasion",
        "danger",
        "threat level",
        "guaranteed spread",
        "infestation",
    ]:
        assert banned not in payload


def test_watch_empty_state_when_local_data_is_sparse(watch_client: TestClient) -> None:
    response = watch_client.get(
        "/consumer/watch",
        params={"lat": "10.000", "lon": "10.000", "radius_km": "1"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["watchedNearYou"] == []
    assert body["goodPlacesToCheck"][0]["type"] == "park_boundaries"
    assert body["emptyState"]["title"] == "Local watch data is still building"


def test_watch_detail_endpoints_reconstruct_context(watch_client: TestClient) -> None:
    screen = watch_client.get(
        "/consumer/watch",
        params={"lat": "40.714", "lon": "-74.006", "radius_km": "5"},
    ).json()
    item_id = screen["watchedNearYou"][0]["id"]
    place_id = screen["goodPlacesToCheck"][0]["id"]

    item = watch_client.get(f"/consumer/watch/items/{item_id}")
    place = watch_client.get(f"/consumer/watch/places/{place_id}")

    assert item.status_code == 200
    assert item.json()["actions"][0]["type"] == "start_report_with_species"
    assert item.json()["uncertaintyNotice"]
    assert place.status_code == 200
    assert place.json()["actions"][0]["type"] == "start_report_with_place_context"
    assert place.json()["relevantWatchItems"]


@pytest.mark.anyio
async def test_watch_cache_is_reused_and_expired_cache_refreshes(
    watch_session: AsyncSession,
) -> None:
    from app.services.watch_service import WatchService

    service = WatchService(watch_session)
    await service.watch_screen(
        latitude=Decimal("40.714"),
        longitude=Decimal("-74.006"),
        radius_km=Decimal("5"),
    )
    cached = (
        await watch_session.execute(select(WatchResponseCache))
    ).scalar_one()
    cached.response_json = {
        **cached.response_json,
        "region": {**cached.response_json["region"], "label": "Cached Area"},
    }
    await watch_session.commit()

    reused = await service.watch_screen(
        latitude=Decimal("40.714"),
        longitude=Decimal("-74.006"),
        radius_km=Decimal("5"),
    )
    assert reused.region.label == "Cached Area"

    cached.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    cached.response_json = {
        **cached.response_json,
        "region": {**cached.response_json["region"], "label": "Expired Area"},
    }
    await watch_session.commit()

    refreshed = await service.watch_screen(
        latitude=Decimal("40.714"),
        longitude=Decimal("-74.006"),
        radius_km=Decimal("5"),
    )
    assert refreshed.region.label != "Expired Area"


@pytest.mark.anyio
async def test_seed_watch_data_is_idempotent(watch_session: AsyncSession) -> None:
    first = await seed_watch_data(watch_session)
    second = await seed_watch_data(watch_session)

    assert first == {"species_watch_profiles": 5, "watch_asset_images": 9}
    assert second == {"species_watch_profiles": 5, "watch_asset_images": 9}
