import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.models.environmental_context import EnvironmentalContext
from app.schemas.environmental_context import EnvironmentalContextCreate, EnvironmentalContextRead
from app.services.environmental_context import EnvironmentalContextService

router = APIRouter(tags=["environmental-context"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get(
    "/observations/{observation_id}/environmental-context",
    response_model=EnvironmentalContextRead,
)
async def get_environmental_context(
    observation_id: uuid.UUID,
    session: SessionDep,
) -> EnvironmentalContext:
    return await EnvironmentalContextService(session).get_context(observation_id)


@router.post(
    "/observations/{observation_id}/environmental-context",
    response_model=EnvironmentalContextRead,
    status_code=status.HTTP_201_CREATED,
)
async def upsert_environmental_context(
    observation_id: uuid.UUID,
    payload: EnvironmentalContextCreate,
    session: SessionDep,
) -> EnvironmentalContext:
    return await EnvironmentalContextService(session).upsert_context(observation_id, payload)


@router.post(
    "/observations/{observation_id}/enrich",
    response_model=EnvironmentalContextRead,
)
async def enrich_observation(
    observation_id: uuid.UUID,
    session: SessionDep,
    provider_name: Annotated[str, Query(min_length=1, max_length=120)] = "static",
) -> EnvironmentalContext:
    return await EnvironmentalContextService(session).enrich_context(
        observation_id,
        provider_name=provider_name,
    )


@router.post(
    "/observations/{observation_id}/environmental-context/recompute",
    response_model=EnvironmentalContextRead,
)
async def recompute_environmental_context(
    observation_id: uuid.UUID,
    session: SessionDep,
) -> EnvironmentalContext:
    return await EnvironmentalContextService(session).recompute_placeholder(observation_id)
