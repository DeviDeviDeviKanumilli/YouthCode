import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.identification import AIIdentification
from app.schemas.identifications import AIIdentificationCreate


class IdentificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        observation_id: uuid.UUID,
        data: AIIdentificationCreate,
    ) -> AIIdentification:
        identification = AIIdentification(observation_id=observation_id, **data.model_dump())
        self.session.add(identification)
        await self.session.flush()
        await self.session.refresh(identification)
        return identification

    async def get(self, identification_id: uuid.UUID) -> AIIdentification | None:
        return await self.session.get(AIIdentification, identification_id)

    async def list_for_observation(self, observation_id: uuid.UUID) -> list[AIIdentification]:
        result = await self.session.execute(
            select(AIIdentification)
            .where(AIIdentification.observation_id == observation_id)
            .order_by(AIIdentification.created_at.desc())
        )
        return list(result.scalars().all())
