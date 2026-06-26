from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.rate_limit import RateLimitMiddleware

OPENAPI_TAGS = [
    {"name": "health", "description": "Service, dependency, and version checks."},
    {"name": "auth", "description": "Internal JWT login helpers and current-user lookup."},
    {"name": "users", "description": "User profiles and role management."},
    {"name": "species", "description": "MVP species catalog and taxonomy search."},
    {"name": "observations", "description": "Consumer and research sighting submissions."},
    {"name": "media", "description": "Observation media metadata and upload URLs."},
    {"name": "identifications", "description": "AI-assisted candidate identifications."},
    {"name": "environmental-context", "description": "Static environmental enrichment context."},
    {"name": "signal-scores", "description": "Ecological signal scoring and explanations."},
    {"name": "forecast", "description": "Public and research map FeatureCollections."},
    {"name": "sampling-gaps", "description": "Sampling grid and survey-gap map layers."},
    {"name": "research", "description": "Research dashboard search, review, and export flows."},
    {"name": "verification", "description": "Verification queue actions and audit history."},
    {"name": "assistant-context", "description": "Grounded context payloads for AI assistants."},
    {"name": "demo", "description": "Deterministic product demo scenarios and seed outputs."},
    {"name": "consumer-watch", "description": "Dynamic consumer Watch tab cards and details."},
]


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or get_settings()
    configure_logging(app_settings.log_level)

    app = FastAPI(
        title=app_settings.app_name,
        version=app_settings.app_version,
        summary="Shared ecological intelligence backend for EcoSentinel.",
        description=(
            "EcoSentinel provides observation intake, AI identification context, "
            "signal scoring, map layers, sampling-gap support, research review tools, "
            "privacy protection, exports, and deterministic demo scenarios."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_tags=OPENAPI_TAGS,
    )
    app.state.settings = app_settings

    register_exception_handlers(app)
    app.add_middleware(RateLimitMiddleware, settings=app_settings)
    app.include_router(api_router)
    return app


app = create_app()
