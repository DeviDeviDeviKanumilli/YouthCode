import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.environmental_context import EnvironmentalContext
from app.models.observation import Observation
from app.repositories.environmental_context import EnvironmentalContextRepository
from app.repositories.observations import ObservationRepository
from app.schemas.environmental_context import EnvironmentalContextCreate


class EnvironmentalContextService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = EnvironmentalContextRepository(session)
        self.observations = ObservationRepository(session)
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
        observation = await self._require_observation(observation_id)
        data = EnvironmentalContextCreate(
            land_cover_class="unknown",
            tree_canopy_pct=None,
            impervious_surface_pct=None,
            ndvi_value=None,
            distance_to_water_m=Decimal("250.00"),
            distance_to_road_m=Decimal("100.00"),
            distance_to_trail_m=None,
            distance_to_park_m=None,
            data_sources={
                "provider": "mock_enrichment",
                "note": "Placeholder context; replace with geospatial enrichment in M5.",
                "observation_region": observation.region_code or "unknown",
            },
            enrichment_version="mock-0.1.0",
        )
        return await self.upsert_context(observation_id, data)

    async def _require_observation(self, observation_id: uuid.UUID) -> Observation:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return observation
