import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.schemas.assistant_context import ObservationAssistantContext
from app.services.assistant_context import AssistantContextService

router = APIRouter(prefix="/assistant/context", tags=["assistant-context"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get("/observation/{observation_id}", response_model=ObservationAssistantContext)
async def observation_context(
    observation_id: uuid.UUID,
    session: SessionDep,
) -> ObservationAssistantContext:
    return await AssistantContextService(session).observation_context(observation_id)
