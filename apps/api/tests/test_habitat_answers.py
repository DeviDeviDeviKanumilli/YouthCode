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
from app.models import Observation, User


@pytest.fixture
def habitat_client() -> Generator[TestClient, None, None]:
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
    tables = [cast(Table, User.__table__), cast(Table, Observation.__table__)]

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


def test_valid_plant_answers_accepted(habitat_client: TestClient) -> None:
    response = habitat_client.post(
        "/observations",
        json={
            "latitude": "40.7128",
            "longitude": "-74.0060",
            "habitat_answers": {
                "organism_type": "plant",
                "growth_pattern": "patch",
                "near_water": "yes",
                "near_road_or_trail": "unknown",
                "habitat_type": "wetland",
            },
        },
    )

    assert response.status_code == 201
    observation = habitat_client.get(f"/observations/{response.json()['observation_id']}").json()
    assert observation["habitat_answers"]["growth_pattern"] == "patch"
    assert observation["habitat_answers"]["near_water"] == "yes"


def test_invalid_plant_enum_rejected(habitat_client: TestClient) -> None:
    response = habitat_client.post(
        "/observations",
        json={
            "latitude": "40.7128",
            "longitude": "-74.0060",
            "habitat_answers": {
                "organism_type": "plant",
                "growth_pattern": "massive_colony",
            },
        },
    )

    assert response.status_code == 422


def test_unknown_values_allowed(habitat_client: TestClient) -> None:
    response = habitat_client.post(
        "/observations",
        json={
            "latitude": "40.7128",
            "longitude": "-74.0060",
            "habitat_answers": {
                "organism_type": "insect",
                "substrate": "unknown",
                "abundance": "unknown",
                "behavior": "unknown",
                "plant_damage_nearby": "unknown",
            },
        },
    )

    assert response.status_code == 201


def test_valid_aquatic_answers_accepted(habitat_client: TestClient) -> None:
    response = habitat_client.post(
        "/observations",
        json={
            "latitude": "40.7128",
            "longitude": "-74.0060",
            "habitat_answers": {
                "organism_type": "aquatic",
                "water_body_type": "stream",
                "organism_position": "floating",
                "water_flow": "slow",
            },
        },
    )

    assert response.status_code == 201


def test_update_habitat_answers_validation(habitat_client: TestClient) -> None:
    created = habitat_client.post(
        "/observations",
        json={"latitude": "40.7128", "longitude": "-74.0060"},
    ).json()

    response = habitat_client.patch(
        f"/observations/{created['observation_id']}",
        json={
            "habitat_answers": {
                "organism_type": "insect",
                "substrate": "building",
                "abundance": "many",
                "behavior": "attached",
                "plant_damage_nearby": "no",
            }
        },
    )

    assert response.status_code == 200
    assert response.json()["habitat_answers"]["behavior"] == "attached"
