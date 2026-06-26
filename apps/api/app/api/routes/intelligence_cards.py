import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.schemas.intelligence_cards import SightingIntelligenceCard
from app.services.intelligence_cards import IntelligenceCardService

router = APIRouter(tags=["intelligence-cards"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get(
    "/observations/{observation_id}/intelligence-card",
    response_model=SightingIntelligenceCard,
)
async def get_intelligence_card(
    observation_id: uuid.UUID,
    session: SessionDep,
) -> SightingIntelligenceCard:
    return await IntelligenceCardService(session).get_card(observation_id)
