import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pipeline import ObservationPipelineRun, PipelineRunStatus


class PipelineRunRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, observation_id: uuid.UUID) -> ObservationPipelineRun:
        run = ObservationPipelineRun(
            observation_id=observation_id,
            status=PipelineRunStatus.pending,
            steps=[],
        )
        self.session.add(run)
        await self.session.flush()
        await self.session.refresh(run)
        return run

    async def get(self, run_id: uuid.UUID) -> ObservationPipelineRun | None:
        return await self.session.get(ObservationPipelineRun, run_id)

    async def latest_for_observation(
        self,
        observation_id: uuid.UUID,
    ) -> ObservationPipelineRun | None:
        result = await self.session.execute(
            select(ObservationPipelineRun)
            .where(ObservationPipelineRun.observation_id == observation_id)
            .order_by(ObservationPipelineRun.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def save(self, run: ObservationPipelineRun) -> ObservationPipelineRun:
        await self.session.flush()
        await self.session.refresh(run)
        return run
