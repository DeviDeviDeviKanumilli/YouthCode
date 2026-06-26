from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "EcoSentinel API"
    service_name: str = "ecosentinel-api"
    app_env: Literal["development", "test", "staging", "production"] = "development"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    log_level: str = "INFO"

    database_url: str = "postgresql+asyncpg://ecosentinel:ecosentinel@localhost:5432/ecosentinel"
    redis_url: str = "redis://localhost:6379/0"
    database_health_enabled: bool = True
    redis_health_enabled: bool = True

    storage_backend: Literal["local", "s3"] = "local"
    local_storage_dir: str = ".local/storage"
    cors_origins: list[AnyHttpUrl] = Field(default_factory=list)


@lru_cache
def get_settings() -> Settings:
    return Settings()
