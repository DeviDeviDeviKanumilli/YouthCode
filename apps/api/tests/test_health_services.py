import pytest

from app.core.config import Settings
from app.services.health import check_database_health, check_redis_health


@pytest.mark.asyncio
async def test_database_health_can_be_disabled() -> None:
    settings = Settings(app_env="test", database_health_enabled=False)

    result = await check_database_health(settings)

    assert result.status == "disabled"
    assert result.component == "database"


@pytest.mark.asyncio
async def test_database_health_returns_unavailable_for_invalid_url() -> None:
    settings = Settings(app_env="test", database_url="not-a-database-url")

    result = await check_database_health(settings)

    assert result.status == "unavailable"
    assert result.component == "database"
    assert "error" in result.details


@pytest.mark.asyncio
async def test_redis_health_can_be_disabled() -> None:
    settings = Settings(app_env="test", redis_health_enabled=False)

    result = await check_redis_health(settings)

    assert result.status == "disabled"
    assert result.component == "redis"


@pytest.mark.asyncio
async def test_redis_health_returns_unavailable_for_invalid_url() -> None:
    settings = Settings(app_env="test", redis_url="redis://127.0.0.1:1/0")

    result = await check_redis_health(settings)

    assert result.status == "unavailable"
    assert result.component == "redis"
    assert "error" in result.details
