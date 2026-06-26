import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status as http_status

from app.api.deps import get_current_user_optional
from app.core.errors import AppError
from app.db.session import get_async_session
from app.models.user import User, UserRole
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
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
) -> User:
    if (payload.role is not None or payload.trusted_reviewer_status is not None) and (
        current_user is None or current_user.role != UserRole.admin
    ):
        raise AppError(
            code="user_management_forbidden",
            message="Only admins can change user roles or reviewer trust status.",
            status_code=http_status.HTTP_403_FORBIDDEN,
        )
    return await UserService(session).update_user(user_id, payload)
