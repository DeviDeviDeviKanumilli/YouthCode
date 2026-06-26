import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.models.verification import Verification
from app.schemas.verification import (
    VerificationAction,
    VerificationEventRead,
    VerificationQueueItem,
    VerificationRead,
)
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


@router.get("/verification/{observation_id}/history", response_model=list[VerificationEventRead])
async def verification_history(
    observation_id: uuid.UUID,
    session: SessionDep,
    requester_id: uuid.UUID,
) -> list[VerificationEventRead]:
    return await VerificationService(session).verification_history(
        observation_id=observation_id,
        requester_id=requester_id,
    )


@router.get("/research/verification-queue", response_model=list[VerificationQueueItem])
async def verification_queue(
    session: SessionDep,
    requester_id: uuid.UUID,
    include_resolved: bool = Query(default=False),
) -> list[VerificationQueueItem]:
    return await VerificationService(session).verification_queue(
        requester_id=requester_id,
        include_resolved=include_resolved,
    )
