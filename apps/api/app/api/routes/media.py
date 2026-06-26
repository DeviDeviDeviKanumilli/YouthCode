import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.models.media import Media
from app.schemas.media import MediaCreate, MediaRead
from app.services.media import MediaService

router = APIRouter(tags=["media"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.post(
    "/observations/{observation_id}/media",
    response_model=MediaRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_observation_media(
    observation_id: uuid.UUID,
    payload: MediaCreate,
    session: SessionDep,
) -> Media:
    return await MediaService(session).create_media(observation_id, payload)


@router.get("/observations/{observation_id}/media", response_model=list[MediaRead])
async def list_observation_media(
    observation_id: uuid.UUID,
    session: SessionDep,
) -> list[Media]:
    return await MediaService(session).list_observation_media(observation_id)


@router.get("/media/{media_id}", response_model=MediaRead)
async def get_media(
    media_id: uuid.UUID,
    session: SessionDep,
) -> Media:
    return await MediaService(session).get_media(media_id)
