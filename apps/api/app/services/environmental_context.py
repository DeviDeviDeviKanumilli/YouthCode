import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.environmental_context import EnvironmentalContext
from app.models.observation import Observation
from app.repositories.environmental_context import EnvironmentalContextRepository
from app.repositories.observations import ObservationRepository
from app.schemas.environmental_context import EnvironmentalContextCreate
from app.services.environmental_enrichment import EnvironmentalEnrichmentService


class EnvironmentalContextService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = EnvironmentalContextRepository(session)
        self.observations = ObservationRepository(session)
        self.enrichment = EnvironmentalEnrichmentService(session)
        self.session = session

    async def get_context(self, observation_id: uuid.UUID) -> EnvironmentalContext:
        context = await self.repository.get(observation_id)
        if context is None:
            raise AppError(
                code="environmental_context_not_found",
                message="Environmental context was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return context

    async def upsert_context(
        self,
        observation_id: uuid.UUID,
        data: EnvironmentalContextCreate,
    ) -> EnvironmentalContext:
        await self._require_observation(observation_id)
        context = await self.repository.upsert(observation_id, data)
        await self.session.commit()
        return context

    async def recompute_placeholder(self, observation_id: uuid.UUID) -> EnvironmentalContext:
        result = await self.enrichment.enrich_observation(observation_id)
        return await self.upsert_context(observation_id, result.to_context_create())

    async def _require_observation(self, observation_id: uuid.UUID) -> Observation:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return observation
