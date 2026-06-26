import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import GUID, Base, JSONVariant, UUIDPrimaryKeyMixin


class ExportFormat(StrEnum):
    csv = "csv"
    geojson = "geojson"


class ExportStatus(StrEnum):
    pending = "pending"
    complete = "complete"
    failed = "failed"


class Export(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "exports"

    requester_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("users.id"),
        index=True,
        nullable=True,
    )
    filters: Mapped[dict[str, Any]] = mapped_column(
        JSONVariant,
        default=dict,
        server_default="{}",
        nullable=False,
    )
    format: Mapped[ExportFormat] = mapped_column(
        Enum(ExportFormat, name="export_format"),
        index=True,
        nullable=False,
    )
    status: Mapped[ExportStatus] = mapped_column(
        Enum(ExportStatus, name="export_status"),
        default=ExportStatus.pending,
        server_default=ExportStatus.pending.value,
        index=True,
        nullable=False,
    )
    download_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    license_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
