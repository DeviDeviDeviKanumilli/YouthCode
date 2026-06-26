import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import GUID, Base, JSONVariant, TimestampMixin, UUIDPrimaryKeyMixin


class PipelineRunStatus(StrEnum):
    pending = "pending"
    running = "running"
    complete = "complete"
    failed = "failed"


class ObservationPipelineRun(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "observation_pipeline_runs"

    observation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("observations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    status: Mapped[PipelineRunStatus] = mapped_column(
        Enum(PipelineRunStatus, name="pipeline_run_status"),
        default=PipelineRunStatus.pending,
        server_default=PipelineRunStatus.pending.value,
        index=True,
        nullable=False,
    )
    steps: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONVariant,
        default=list,
        server_default="[]",
        nullable=False,
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
