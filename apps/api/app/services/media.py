import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.media import Media
from app.repositories.media import MediaRepository
from app.repositories.observations import ObservationRepository
from app.schemas.media import MediaCreate


class MediaService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = MediaRepository(session)
        self.observations = ObservationRepository(session)
        self.session = session

    async def create_media(self, observation_id: uuid.UUID, data: MediaCreate) -> Media:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        media = await self.repository.create(observation_id, data)
        await self.session.commit()
        return media

    async def list_observation_media(self, observation_id: uuid.UUID) -> list[Media]:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return await self.repository.list_for_observation(observation_id)

    async def get_media(self, media_id: uuid.UUID) -> Media:
        media = await self.repository.get(media_id)
        if media is None:
            raise AppError(
                code="media_not_found",
                message="Media was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return media
