import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.models.signal_score import SignalScore
from app.schemas.score_explanations import SignalScoreExplanation
from app.schemas.signal_scores import SignalScoreRead
from app.services.signal_scores import SignalScoreService

router = APIRouter(tags=["signal-scores"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get("/observations/{observation_id}/signal-score", response_model=SignalScoreRead)
async def get_signal_score(
    observation_id: uuid.UUID,
    session: SessionDep,
) -> SignalScore:
    return await SignalScoreService(session).get_score(observation_id)


@router.post(
    "/observations/{observation_id}/signal-score/recompute",
    response_model=SignalScoreRead,
)
async def recompute_signal_score(
    observation_id: uuid.UUID,
    session: SessionDep,
) -> SignalScore:
    return await SignalScoreService(session).recompute_score(observation_id)


@router.get(
    "/observations/{observation_id}/signal-score/explanation",
    response_model=SignalScoreExplanation,
)
async def explain_signal_score(
    observation_id: uuid.UUID,
    session: SessionDep,
) -> SignalScoreExplanation:
    return await SignalScoreService(session).explain_score(observation_id)
