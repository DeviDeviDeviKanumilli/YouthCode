import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.media import Media
from app.repositories.media import MediaRepository
from app.repositories.observations import ObservationRepository
from app.schemas.media import MediaCreate

MAX_MEDIA_SIZE_BYTES = 25 * 1024 * 1024
ALLOWED_MIME_PREFIXES = {
    "image": ("image/",),
    "audio": ("audio/",),
    "video": ("video/",),
    "other": ("application/pdf", "text/plain"),
}


class MediaService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = MediaRepository(session)
        self.observations = ObservationRepository(session)
        self.session = session

    async def create_media(self, observation_id: uuid.UUID, data: MediaCreate) -> Media:
        self._validate_media(data)
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

    def _validate_media(self, data: MediaCreate) -> None:
        if data.size_bytes is not None and data.size_bytes > MAX_MEDIA_SIZE_BYTES:
            raise AppError(
                code="media_too_large",
                message="Media files must be 25 MB or smaller.",
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
        allowed = ALLOWED_MIME_PREFIXES[data.file_type.value]
        if not any(data.mime_type.startswith(prefix) for prefix in allowed):
            raise AppError(
                code="unsupported_media_type",
                message="Media MIME type does not match the declared file type.",
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )

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
