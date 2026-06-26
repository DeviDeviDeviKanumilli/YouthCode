from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

from app.schemas.health import ComponentHealthResponse, HealthResponse, VersionResponse
from app.services.health import check_database_health, check_redis_health

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    settings = request.app.state.settings
    return HealthResponse(
        status="ok",
        service=settings.service_name,
        environment=settings.app_env,
    )


@router.get("/health/db", response_model=ComponentHealthResponse)
async def database_health(request: Request) -> ComponentHealthResponse | JSONResponse:
    settings = request.app.state.settings
    result = await check_database_health(settings)
    response = ComponentHealthResponse(
        status=result.status,
        component=result.component,
        service=settings.service_name,
        environment=settings.app_env,
        details=result.details or None,
    )
    if result.status == "unavailable":
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response.model_dump(),
        )
    return response


@router.get("/health/redis", response_model=ComponentHealthResponse)
async def redis_health(request: Request) -> ComponentHealthResponse | JSONResponse:
    settings = request.app.state.settings
    result = await check_redis_health(settings)
    response = ComponentHealthResponse(
        status=result.status,
        component=result.component,
        service=settings.service_name,
        environment=settings.app_env,
        details=result.details or None,
    )
    if result.status == "unavailable":
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response.model_dump(),
        )
    return response


@router.get("/version", response_model=VersionResponse)
async def version(request: Request) -> VersionResponse:
    settings = request.app.state.settings
    return VersionResponse(
        service=settings.service_name,
        version=settings.app_version,
        environment=settings.app_env,
    )
