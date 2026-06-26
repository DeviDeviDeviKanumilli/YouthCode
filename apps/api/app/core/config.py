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
    auth_token_secret: str = "dev-only-change-me"
    auth_token_issuer: str = "ecosentinel-api"
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 60
    rate_limit_window_seconds: int = 60
    media_max_file_size_bytes: int = 25 * 1024 * 1024

    storage_backend: Literal["local", "s3"] = "local"
    local_storage_dir: str = ".local/storage"
    cors_origins: list[AnyHttpUrl] = Field(default_factory=list)


@lru_cache
def get_settings() -> Settings:
    return Settings()
