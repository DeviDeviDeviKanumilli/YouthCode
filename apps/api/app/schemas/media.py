import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.media import MediaFileType


class MediaCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    file_type: MediaFileType
    mime_type: str = Field(min_length=1, max_length=120)
    storage_key: str = Field(min_length=1, max_length=500)
    public_url: str | None = Field(default=None, max_length=1000)
    original_filename: str | None = Field(default=None, max_length=255)
    size_bytes: int | None = Field(default=None, ge=0)
    quality_score: Decimal | None = Field(default=None, ge=Decimal("0"), le=Decimal("100"))
    metadata_removed: bool = False


class MediaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    observation_id: uuid.UUID
    file_type: MediaFileType
    mime_type: str
    storage_key: str
    public_url: str | None
    original_filename: str | None
    size_bytes: int | None
    quality_score: Decimal | None
    metadata_removed: bool
    created_at: datetime
