import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import GUID, Base, UUIDPrimaryKeyMixin


class MediaFileType(StrEnum):
    image = "image"
    audio = "audio"
    video = "video"
    other = "other"


class Media(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "media"

    observation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("observations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    file_type: Mapped[MediaFileType] = mapped_column(
        Enum(MediaFileType, name="media_file_type"),
        index=True,
        nullable=False,
    )
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    public_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quality_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    metadata_removed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
