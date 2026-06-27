from collections.abc import AsyncGenerator, Generator
from pathlib import Path
from typing import Any, cast

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_async_session
from app.main import create_app
from app.models import Media, Observation, User


@pytest.fixture
def media_client(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[TestClient, None, None]:
    storage_dir = tmp_path / "storage"
    monkeypatch.setenv("LOCAL_STORAGE_DIR", str(storage_dir))
    get_settings.cache_clear()

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
        cast(Table, Media.__table__),
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
    app.dependency_overrides[get_async_session] = override_session

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    anyio.run(drop_tables)
    get_settings.cache_clear()


def create_observation(client: TestClient) -> str:
    response = client.post(
        "/observations",
        json={
            "timestamp": "2026-06-26T12:00:00Z",
            "latitude": "40.7128",
            "longitude": "-74.0060",
            "habitat_answers": {"near_water": "yes"},
        },
    )
    assert response.status_code == 201
    body = cast(dict[str, Any], response.json())
    return str(body["observation_id"])


def create_media(client: TestClient, observation_id: str) -> dict[str, Any]:
    response = client.post(
        f"/observations/{observation_id}/media",
        json={
            "file_type": "image",
            "mime_type": "image/jpeg",
            "storage_key": f"observations/{observation_id}/photo.jpg",
            "public_url": "http://localhost:8000/media/photo.jpg",
            "original_filename": "photo.jpg",
            "size_bytes": 2048,
            "quality_score": "87.5",
            "metadata_removed": True,
        },
    )
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def test_create_media_metadata(media_client: TestClient) -> None:
    observation_id = create_observation(media_client)

    body = create_media(media_client, observation_id)

    assert body["observation_id"] == observation_id
    assert body["file_type"] == "image"
    assert body["mime_type"] == "image/jpeg"
    assert body["storage_key"].endswith("/photo.jpg")
    assert body["metadata_removed"] is True


def test_list_observation_media(media_client: TestClient) -> None:
    observation_id = create_observation(media_client)
    created = create_media(media_client, observation_id)

    response = media_client.get(f"/observations/{observation_id}/media")

    assert response.status_code == 200
    assert response.json()[0]["id"] == created["id"]


def test_get_media_by_id(media_client: TestClient) -> None:
    observation_id = create_observation(media_client)
    created = create_media(media_client, observation_id)

    response = media_client.get(f"/media/{created['id']}")

    assert response.status_code == 200
    assert response.json()["storage_key"] == created["storage_key"]


def test_upload_media_file_stores_bytes_and_metadata(media_client: TestClient) -> None:
    observation_id = create_observation(media_client)

    response = media_client.post(
        f"/observations/{observation_id}/media/upload",
        files={"file": ("photo.jpg", b"fake-image-bytes", "image/jpeg")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["observation_id"] == observation_id
    assert body["file_type"] == "image"
    assert body["mime_type"] == "image/jpeg"
    assert body["storage_key"].startswith(f"observations/{observation_id}/")
    assert body["storage_key"].endswith(".jpg")
    assert body["size_bytes"] == len(b"fake-image-bytes")
    assert body["metadata_removed"] is True
    assert body["public_url"].startswith("/media-files/observations/")

    stored = Path(get_settings().local_storage_dir) / body["storage_key"]
    assert stored.read_bytes() == b"fake-image-bytes"

    file_response = media_client.get(body["public_url"])
    assert file_response.status_code == 200
    assert file_response.content == b"fake-image-bytes"


def test_upload_media_rejects_mismatched_mime_type(media_client: TestClient) -> None:
    observation_id = create_observation(media_client)

    response = media_client.post(
        f"/observations/{observation_id}/media/upload",
        files={"file": ("photo.pdf", b"not-an-image", "application/pdf")},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "unsupported_media_type"


def test_reject_unsupported_file_type(media_client: TestClient) -> None:
    observation_id = create_observation(media_client)

    response = media_client.post(
        f"/observations/{observation_id}/media",
        json={
            "file_type": "spreadsheet",
            "mime_type": "application/vnd.ms-excel",
            "storage_key": "bad.xls",
        },
    )

    assert response.status_code == 422


def test_reject_mismatched_mime_type(media_client: TestClient) -> None:
    observation_id = create_observation(media_client)

    response = media_client.post(
        f"/observations/{observation_id}/media",
        json={
            "file_type": "image",
            "mime_type": "application/pdf",
            "storage_key": "bad.pdf",
        },
    )

    assert response.status_code == 422
    assert response.json()["code"] == "unsupported_media_type"


def test_reject_oversized_media(media_client: TestClient) -> None:
    observation_id = create_observation(media_client)

    response = media_client.post(
        f"/observations/{observation_id}/media",
        json={
            "file_type": "image",
            "mime_type": "image/jpeg",
            "storage_key": "large.jpg",
            "size_bytes": 26214401,
        },
    )

    assert response.status_code == 422
    assert response.json()["code"] == "media_too_large"


def test_missing_observation_rejected(media_client: TestClient) -> None:
    response = media_client.post(
        "/observations/11111111-1111-1111-1111-111111111111/media",
        json={
            "file_type": "image",
            "mime_type": "image/jpeg",
            "storage_key": "missing/photo.jpg",
        },
    )

    assert response.status_code == 404
    assert response.json()["code"] == "observation_not_found"
