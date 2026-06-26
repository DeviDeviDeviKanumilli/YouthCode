from typing import Any, Literal

from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings

HealthStatus = Literal["ok", "unavailable", "disabled"]


class ComponentHealth:
    def __init__(
        self,
        status: HealthStatus,
        component: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.status = status
        self.component = component
        self.details = details or {}


async def check_database_health(settings: Settings) -> ComponentHealth:
    if not settings.database_health_enabled:
        return ComponentHealth(
            status="disabled",
            component="database",
            details={"reason": "Database health checks are disabled."},
        )

    engine = None
    try:
        engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except Exception as exc:
        return ComponentHealth(
            status="unavailable",
            component="database",
            details={"error": exc.__class__.__name__},
        )
    finally:
        if engine is not None:
            await engine.dispose()

    return ComponentHealth(status="ok", component="database")


async def check_redis_health(settings: Settings) -> ComponentHealth:
    if not settings.redis_health_enabled:
        return ComponentHealth(
            status="disabled",
            component="redis",
            details={"reason": "Redis health checks are disabled."},
        )

    redis = Redis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=1)
    try:
        await redis.ping()
    except Exception as exc:
        return ComponentHealth(
            status="unavailable",
            component="redis",
            details={"error": exc.__class__.__name__},
        )
    finally:
        await redis.aclose()

    return ComponentHealth(status="ok", component="redis")
