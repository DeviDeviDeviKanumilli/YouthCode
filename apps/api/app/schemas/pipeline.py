import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.pipeline import PipelineRunStatus


class PipelineStatusResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observation_id: uuid.UUID
    current_status: PipelineRunStatus
    completed_steps: list[str] = Field(default_factory=list)
    failed_steps: list[dict[str, str | None]] = Field(default_factory=list)
    next_available_user_action: str
