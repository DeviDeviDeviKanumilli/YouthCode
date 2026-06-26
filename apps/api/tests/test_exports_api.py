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
from app.models import Export, User


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
    tables = [cast(Table, User.__table__), cast(Table, Export.__table__)]

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
