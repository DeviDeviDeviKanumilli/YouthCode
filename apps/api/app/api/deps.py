import uuid
from typing import Annotated, cast

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.auth import TokenError, decode_access_token
from app.core.config import Settings
from app.core.errors import AppError
from app.db.session import get_async_session
from app.models.user import User
from app.repositories.users import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


def get_request_settings(request: Request) -> Settings:
    return cast(Settings, request.app.state.settings)


async def get_current_user_optional(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    settings: Annotated[Settings, Depends(get_request_settings)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)] = None,
) -> User | None:
    if credentials is None:
        return None
    try:
        payload = decode_access_token(credentials.credentials, settings)
        user_id = uuid.UUID(str(payload["sub"]))
    except (TokenError, ValueError) as exc:
        raise AppError(
            code="invalid_token",
            message="Authentication token is invalid or expired.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        ) from exc
    user = await UserRepository(session).get(user_id)
    if user is None:
        raise AppError(
            code="current_user_not_found",
            message="Authenticated user was not found.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    return user


async def get_current_user(
    current_user: Annotated[User | None, Depends(get_current_user_optional)],
) -> User:
    if current_user is None:
        raise AppError(
            code="auth_required",
            message="Authentication is required.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    return current_user
