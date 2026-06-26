import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.models.verification import Verification
from app.schemas.verification import VerificationAction, VerificationQueueItem, VerificationRead
from app.services.verification import VerificationService

router = APIRouter(tags=["verification"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get("/observations/{observation_id}/verification", response_model=VerificationRead)
async def get_verification(
    observation_id: uuid.UUID,
    session: SessionDep,
) -> Verification:
    return await VerificationService(session).get_verification(observation_id)


@router.post("/verification/{observation_id}", response_model=VerificationRead)
async def apply_verification_action(
    observation_id: uuid.UUID,
    payload: VerificationAction,
    session: SessionDep,
) -> Verification:
    return await VerificationService(session).apply_action(observation_id, payload)


@router.get("/research/verification-queue", response_model=list[VerificationQueueItem])
async def verification_queue(session: SessionDep) -> list[VerificationQueueItem]:
    return await VerificationService(session).verification_queue()
