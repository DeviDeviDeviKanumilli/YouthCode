import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.models.identification import AIIdentification
from app.schemas.identifications import AIIdentificationCreate, AIIdentificationRead
from app.services.identifications import IdentificationService

router = APIRouter(tags=["identifications"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.post(
    "/observations/{observation_id}/identifications",
    response_model=AIIdentificationRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_observation_identification(
    observation_id: uuid.UUID,
    payload: AIIdentificationCreate,
    session: SessionDep,
) -> AIIdentification:
    return await IdentificationService(session).create_identification(observation_id, payload)


@router.get(
    "/observations/{observation_id}/identifications",
    response_model=list[AIIdentificationRead],
)
async def list_observation_identifications(
    observation_id: uuid.UUID,
    session: SessionDep,
) -> list[AIIdentification]:
    return await IdentificationService(session).list_observation_identifications(observation_id)


@router.get("/identifications/{identification_id}", response_model=AIIdentificationRead)
async def get_identification(
    identification_id: uuid.UUID,
    session: SessionDep,
) -> AIIdentification:
    return await IdentificationService(session).get_identification(identification_id)
