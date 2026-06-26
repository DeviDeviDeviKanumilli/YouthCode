from app.core.config import Settings


def test_settings_have_required_defaults() -> None:
    settings = Settings(app_env="test")

    assert settings.app_name == "EcoSentinel API"
    assert settings.service_name == "ecosentinel-api"
    assert settings.app_env == "test"
    assert settings.app_version
    assert settings.database_url.startswith("postgresql+asyncpg://")
    assert settings.redis_url.startswith("redis://")


def test_settings_load_from_environment(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.setenv("APP_VERSION", "9.9.9")

    settings = Settings()

    assert settings.app_env == "staging"
    assert settings.app_version == "9.9.9"
