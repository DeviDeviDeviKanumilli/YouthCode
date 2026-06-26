import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.schemas.assistant_context import (
    ObservationAssistantContext,
    RegionAssistantContext,
    ResearchAssistantContext,
    ResearchAssistantContextRequest,
)
from app.services.assistant_context import AssistantContextService

router = APIRouter(prefix="/assistant/context", tags=["assistant-context"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get("/observation/{observation_id}", response_model=ObservationAssistantContext)
async def observation_context(
    observation_id: uuid.UUID,
    session: SessionDep,
) -> ObservationAssistantContext:
    return await AssistantContextService(session).observation_context(observation_id)


@router.get("/region", response_model=RegionAssistantContext)
async def region_context(
    session: SessionDep,
    lat: Annotated[Decimal, Query(ge=Decimal("-90"), le=Decimal("90"))],
    lon: Annotated[Decimal, Query(ge=Decimal("-180"), le=Decimal("180"))],
    radius_km: Annotated[Decimal, Query(gt=Decimal("0"), le=Decimal("100"))],
) -> RegionAssistantContext:
    return await AssistantContextService(session).region_context(
        latitude=lat,
        longitude=lon,
        radius_km=radius_km,
    )


@router.post("/research", response_model=ResearchAssistantContext)
async def research_context(
    payload: ResearchAssistantContextRequest,
    session: SessionDep,
) -> ResearchAssistantContext:
    return await AssistantContextService(session).research_context(payload)
