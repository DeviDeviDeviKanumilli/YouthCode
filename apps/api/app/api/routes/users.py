import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.models.user import User
from app.schemas.users import UserCreate, UserRead, UserUpdate
from app.services.users import UserService

router = APIRouter(prefix="/users", tags=["users"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    session: SessionDep,
) -> User:
    return await UserService(session).create_user(payload)


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: uuid.UUID,
    session: SessionDep,
) -> User:
    return await UserService(session).get_user(user_id)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    session: SessionDep,
) -> User:
    return await UserService(session).update_user(user_id, payload)
