import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.user import User
from app.repositories.users import UserRepository
from app.schemas.users import UserCreate, UserUpdate


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = UserRepository(session)
        self.session = session

    async def create_user(self, data: UserCreate) -> User:
        if data.email:
            existing = await self.repository.get_by_email(str(data.email))
            if existing is not None:
                raise AppError(
                    code="user_email_conflict",
                    message="A user with this email already exists.",
                    status_code=status.HTTP_409_CONFLICT,
                )

        user = await self.repository.create(data)
        await self.session.commit()
        return user

    async def get_user(self, user_id: uuid.UUID) -> User:
        user = await self.repository.get(user_id)
        if user is None:
            raise AppError(
                code="user_not_found",
                message="User was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return user

    async def update_user(self, user_id: uuid.UUID, data: UserUpdate) -> User:
        user = await self.get_user(user_id)
        updated_user = await self.repository.update(user, data)
        await self.session.commit()
        return updated_user
