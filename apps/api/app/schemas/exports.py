import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.export import ExportFormat, ExportStatus


class ExportCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    requester_id: uuid.UUID | None = None
    filters: dict[str, Any] = Field(default_factory=dict)
    format: ExportFormat
    license_summary: str | None = None


class ExportUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ExportStatus | None = None
    download_url: str | None = Field(default=None, max_length=1000)
    license_summary: str | None = None
    completed_at: datetime | None = None


class ExportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    requester_id: uuid.UUID | None
    filters: dict[str, Any]
    format: ExportFormat
    status: ExportStatus
    download_url: str | None
    license_summary: str | None
    created_at: datetime
    completed_at: datetime | None
