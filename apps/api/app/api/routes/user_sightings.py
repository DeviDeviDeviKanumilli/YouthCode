import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.schemas.user_sightings import UserObservationListItem
from app.services.user_sightings import UserSightingsService

router = APIRouter(tags=["user-sightings"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get("/users/{user_id}/observations", response_model=list[UserObservationListItem])
async def list_user_observations(
    user_id: uuid.UUID,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[UserObservationListItem]:
    return await UserSightingsService(session).list_user_sightings(
        user_id,
        limit=limit,
        offset=offset,
    )
