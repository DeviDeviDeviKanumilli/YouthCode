import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.jobs.definitions import register_job_definitions
from app.jobs.queue import InMemoryJobBackend, JobQueue, JobStatus
from app.models.pipeline import ObservationPipelineRun, PipelineRunStatus
from app.repositories.observations import ObservationRepository
from app.repositories.pipeline import PipelineRunRepository
from app.schemas.pipeline import PipelineStatusResponse

PIPELINE_STEPS = [
    "identify_observation",
    "enrich_observation",
    "score_observation",
]


class ObservationPipelineService:
    def __init__(self, session: AsyncSession, queue: JobQueue | None = None) -> None:
        self.observations = ObservationRepository(session)
        self.repository = PipelineRunRepository(session)
        self.queue = queue or JobQueue(InMemoryJobBackend())
        if not self.queue.handlers:
            register_job_definitions(self.queue)
        self.session = session

    async def start_pipeline(self, observation_id: uuid.UUID) -> ObservationPipelineRun:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        run = await self.repository.create(observation_id)
        await self.session.commit()
        return run

    async def run_pipeline(
        self,
        observation_id: uuid.UUID,
        *,
        steps: list[str] | None = None,
    ) -> ObservationPipelineRun:
        run = await self.start_pipeline(observation_id)
        run.status = PipelineRunStatus.running
        run.started_at = datetime.now(UTC)
        run.steps = []
        await self.repository.save(run)
        await self.session.commit()
        for step_name in steps or PIPELINE_STEPS:
            queued = await self.queue.enqueue(step_name, {"observation_id": str(observation_id)})
            result = await self.queue.run_next()
            if result is None:
                continue
            run.steps = [
                *run.steps,
                {
                    "name": step_name,
                    "job_id": str(queued.id),
                    "status": result.status.value,
                    "error": result.error,
                },
            ]
            if result.status == JobStatus.failed:
                run.status = PipelineRunStatus.failed
                run.error = result.error
                run.completed_at = datetime.now(UTC)
                await self.repository.save(run)
                await self.session.commit()
                return run
        run.status = PipelineRunStatus.complete
        run.completed_at = datetime.now(UTC)
        await self.repository.save(run)
        await self.session.commit()
        return run

    async def pipeline_status(self, observation_id: uuid.UUID) -> PipelineStatusResponse:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        run = await self.repository.latest_for_observation(observation_id)
        if run is None:
            return PipelineStatusResponse(
                observation_id=observation_id,
                current_status=PipelineRunStatus.pending,
                completed_steps=[],
                failed_steps=[],
                next_available_user_action="attach_media_or_wait_for_processing",
            )
        completed_steps = [
            step["name"] for step in run.steps if step.get("status") == "complete"
        ]
        failed_steps = [
            {"name": step["name"], "error": step.get("error")}
            for step in run.steps
            if step.get("status") == "failed"
        ]
        return PipelineStatusResponse(
            observation_id=observation_id,
            current_status=run.status,
            completed_steps=completed_steps,
            failed_steps=failed_steps,
            next_available_user_action=self._next_action(run.status),
        )

    def _next_action(self, status: PipelineRunStatus) -> str:
        if status == PipelineRunStatus.complete:
            return "review_results"
        if status == PipelineRunStatus.failed:
            return "review_error_and_retry_or_add_evidence"
        if status == PipelineRunStatus.running:
            return "wait_for_processing"
        return "attach_media_or_wait_for_processing"
