import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.observation import Observation
from app.repositories.observations import ObservationRepository
from app.schemas.observations import ObservationCreate, ObservationUpdate


class ObservationService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = ObservationRepository(session)
        self.session = session

    async def create_observation(self, data: ObservationCreate) -> Observation:
        observation = await self.repository.create(data)
        await self.session.commit()
        return observation

    async def get_observation(self, observation_id: uuid.UUID) -> Observation:
        observation = await self.repository.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return observation

    async def list_observations(
        self,
        *,
        bbox: tuple[Decimal, Decimal, Decimal, Decimal] | None = None,
        user_id: uuid.UUID | None = None,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Observation]:
        return await self.repository.list(
            bbox=bbox,
            user_id=user_id,
            from_date=from_date,
            to_date=to_date,
            limit=limit,
            offset=offset,
        )

    async def update_observation(
        self,
        observation_id: uuid.UUID,
        data: ObservationUpdate,
    ) -> Observation:
        observation = await self.get_observation(observation_id)
        updated_observation = await self.repository.update(observation, data)
        await self.session.commit()
        return updated_observation
