from collections.abc import AsyncGenerator, Generator
from typing import Any, cast
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.auth import create_access_token
from app.core.config import Settings
from app.db.base import Base
from app.db.session import get_async_session
from app.main import create_app
from app.models import User


@pytest.fixture
def users_client() -> Generator[TestClient, None, None]:
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
    user_table = cast(Table, User.__table__)

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    async def create_tables() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all, tables=[user_table])

    async def drop_tables() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all, tables=[user_table])
        await engine.dispose()

    import anyio

    anyio.run(create_tables)
    app = create_app()
    app.dependency_overrides[get_async_session] = override_session

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    anyio.run(drop_tables)


def test_create_user(users_client: TestClient) -> None:
    response = users_client.post(
        "/users",
        json={
            "email": "student@example.com",
            "display_name": "Student Observer",
            "role": "consumer",
            "school_or_org": "Eco High",
            "privacy_settings": {"location_precision": "obscured"},
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "student@example.com"
    assert body["display_name"] == "Student Observer"
    assert body["role"] == "consumer"
    assert body["trusted_reviewer_status"] is False
    assert body["privacy_settings"] == {"location_precision": "obscured"}


def test_read_user(users_client: TestClient) -> None:
    created = users_client.post("/users", json={"display_name": "Anonymous"}).json()

    response = users_client.get(f"/users/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_update_user_role(users_client: TestClient) -> None:
    created = users_client.post("/users", json={"display_name": "Reviewer"}).json()
    admin = users_client.post("/users", json={"email": "admin@example.com", "role": "admin"}).json()
    settings = cast(Settings, cast(Any, users_client.app).state.settings)
    token = create_access_token(
        user_id=UUID(str(admin["id"])),
        role="admin",
        settings=settings,
    )

    response = users_client.patch(
        f"/users/{created['id']}",
        json={"role": "reviewer", "trusted_reviewer_status": True},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "reviewer"
    assert body["trusted_reviewer_status"] is True


def test_non_admin_cannot_update_user_role(users_client: TestClient) -> None:
    created = users_client.post("/users", json={"display_name": "Reviewer"}).json()
    consumer = users_client.post(
        "/users",
        json={"email": "consumer@example.com", "role": "consumer"},
    ).json()
    settings = cast(Settings, cast(Any, users_client.app).state.settings)
    token = create_access_token(
        user_id=UUID(str(consumer["id"])),
        role="consumer",
        settings=settings,
    )

    response = users_client.patch(
        f"/users/{created['id']}",
        json={"role": "reviewer"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json()["code"] == "user_management_forbidden"


def test_invalid_role_rejected(users_client: TestClient) -> None:
    response = users_client.post(
        "/users",
        json={"display_name": "Bad Role", "role": "super_ecologist"},
    )

    assert response.status_code == 422


def test_duplicate_email_rejected(users_client: TestClient) -> None:
    payload = {"email": "researcher@example.com", "role": "researcher"}
    first_response = users_client.post("/users", json=payload)

    second_response = users_client.post("/users", json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert second_response.json()["code"] == "user_email_conflict"
