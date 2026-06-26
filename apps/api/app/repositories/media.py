import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.media import Media
from app.schemas.media import MediaCreate


class MediaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, observation_id: uuid.UUID, data: MediaCreate) -> Media:
        media = Media(observation_id=observation_id, **data.model_dump())
        self.session.add(media)
        await self.session.flush()
        await self.session.refresh(media)
        return media

    async def get(self, media_id: uuid.UUID) -> Media | None:
        return await self.session.get(Media, media_id)

    async def list_for_observation(self, observation_id: uuid.UUID) -> list[Media]:
        result = await self.session.execute(
            select(Media)
            .where(Media.observation_id == observation_id)
            .order_by(Media.created_at.desc())
        )
        return list(result.scalars().all())
