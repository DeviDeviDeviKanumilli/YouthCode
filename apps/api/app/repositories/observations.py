import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.observation import Observation
from app.schemas.observations import ObservationCreate, ObservationUpdate


class ObservationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, data: ObservationCreate) -> Observation:
        create_data = data.model_dump()
        observation = Observation(**create_data)
        self.session.add(observation)
        await self.session.flush()
        await self.session.refresh(observation)
        return observation

    async def get(self, observation_id: uuid.UUID) -> Observation | None:
        return await self.session.get(Observation, observation_id)

    async def list(
        self,
        *,
        bbox: tuple[Decimal, Decimal, Decimal, Decimal] | None = None,
        user_id: uuid.UUID | None = None,
        region_code: str | None = None,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Observation]:
        statement: Select[tuple[Observation]] = select(Observation)
        if bbox is not None:
            min_lon, min_lat, max_lon, max_lat = bbox
            statement = statement.where(
                Observation.longitude >= min_lon,
                Observation.longitude <= max_lon,
                Observation.latitude >= min_lat,
                Observation.latitude <= max_lat,
            )
        if user_id is not None:
            statement = statement.where(Observation.user_id == user_id)
        if region_code is not None:
            statement = statement.where(Observation.region_code == region_code)
        if from_date is not None:
            statement = statement.where(Observation.timestamp >= from_date)
        if to_date is not None:
            statement = statement.where(Observation.timestamp <= to_date)
        statement = statement.order_by(Observation.timestamp.desc()).limit(limit).offset(offset)
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def update(self, observation: Observation, data: ObservationUpdate) -> Observation:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(observation, field, value)
        await self.session.flush()
        await self.session.refresh(observation)
        return observation
