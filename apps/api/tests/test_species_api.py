from collections.abc import AsyncGenerator, Generator
from typing import cast

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_async_session
from app.main import create_app
from app.models import Species


@pytest.fixture
def species_client() -> Generator[TestClient, None, None]:
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
    species_table = cast(Table, Species.__table__)

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    async def create_tables() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all, tables=[species_table])

    async def drop_tables() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all, tables=[species_table])
        await engine.dispose()

    import anyio

    anyio.run(create_tables)
    app = create_app()
    app.dependency_overrides[get_async_session] = override_session

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    anyio.run(drop_tables)


def test_create_species_with_state_status(species_client: TestClient) -> None:
    response = species_client.post(
        "/species",
        json={
            "scientific_name": "Fallopia japonica",
            "common_name": "Japanese knotweed",
            "common_names": ["Japanese knotweed", "Asian knotweed"],
            "gbif_taxon_id": 2889174,
            "kingdom": "Plantae",
            "taxon_rank": "species",
            "native_status_by_state": {"NY": "non_native"},
            "invasive_status_by_state": {"NY": "regulated", "NJ": "invasive", "PA": "invasive"},
            "synonyms": ["Reynoutria japonica"],
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["scientific_name"] == "Fallopia japonica"
    assert body["common_name"] == "Japanese knotweed"
    assert body["invasive_status_by_state"]["NJ"] == "invasive"
    assert body["synonyms"] == ["Reynoutria japonica"]


def test_search_species_by_scientific_name(species_client: TestClient) -> None:
    species_client.post(
        "/species",
        json={"scientific_name": "Lycorma delicatula", "common_name": "Spotted lanternfly"},
    )

    response = species_client.get("/species/search", params={"q": "Lycorma"})

    assert response.status_code == 200
    assert response.json()[0]["scientific_name"] == "Lycorma delicatula"


def test_search_species_by_common_name(species_client: TestClient) -> None:
    species_client.post(
        "/species",
        json={"scientific_name": "Trapa natans", "common_name": "Water chestnut"},
    )

    response = species_client.get("/species/search", params={"q": "chestnut"})

    assert response.status_code == 200
    assert response.json()[0]["common_name"] == "Water chestnut"


def test_update_species(species_client: TestClient) -> None:
    created = species_client.post(
        "/species",
        json={"scientific_name": "Lythrum salicaria", "common_name": "Purple loosestrife"},
    ).json()

    response = species_client.patch(
        f"/species/{created['id']}",
        json={"invasive_status_by_state": {"NY": "invasive", "NJ": "invasive"}},
    )

    assert response.status_code == 200
    assert response.json()["invasive_status_by_state"] == {"NY": "invasive", "NJ": "invasive"}


def test_duplicate_scientific_name_rejected(species_client: TestClient) -> None:
    payload = {"scientific_name": "Agrilus planipennis", "common_name": "Emerald ash borer"}
    first_response = species_client.post("/species", json=payload)

    second_response = species_client.post("/species", json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert second_response.json()["code"] == "species_scientific_name_conflict"
