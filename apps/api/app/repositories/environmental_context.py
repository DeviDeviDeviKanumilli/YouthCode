import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.environmental_context import EnvironmentalContext
from app.schemas.environmental_context import EnvironmentalContextCreate


class EnvironmentalContextRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def upsert(
        self,
        observation_id: uuid.UUID,
        data: EnvironmentalContextCreate,
    ) -> EnvironmentalContext:
        context = await self.get(observation_id)
        if context is None:
            context = EnvironmentalContext(observation_id=observation_id, **data.model_dump())
            self.session.add(context)
        else:
            for field, value in data.model_dump().items():
                setattr(context, field, value)
        await self.session.flush()
        await self.session.refresh(context)
        return context

    async def get(self, observation_id: uuid.UUID) -> EnvironmentalContext | None:
        return await self.session.get(EnvironmentalContext, observation_id)
