from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.rate_limit import RateLimitMiddleware


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or get_settings()
    configure_logging(app_settings.log_level)

    app = FastAPI(
        title=app_settings.app_name,
        version=app_settings.app_version,
        summary="Shared ecological intelligence backend for EcoSentinel.",
        docs_url="/docs",
        redoc_url="/redoc",
    )
    app.state.settings = app_settings

    register_exception_handlers(app)
    app.add_middleware(RateLimitMiddleware, settings=app_settings)
    app.include_router(api_router)
    return app


app = create_app()
