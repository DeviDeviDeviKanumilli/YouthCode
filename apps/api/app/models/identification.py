import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import GUID, Base, JSONVariant, UUIDPrimaryKeyMixin


class ConfidenceLabel(StrEnum):
    low = "low"
    medium = "medium"
    medium_high = "medium_high"
    high = "high"


class AIIdentification(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "ai_identifications"

    observation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("observations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    candidate_species_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("species.id"),
        index=True,
        nullable=True,
    )
    candidate_scientific_name: Mapped[str] = mapped_column(String(255), nullable=False)
    candidate_common_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    confidence: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    confidence_label: Mapped[ConfidenceLabel] = mapped_column(
        Enum(ConfidenceLabel, name="confidence_label"),
        nullable=False,
    )
    model_name: Mapped[str] = mapped_column(String(120), nullable=False)
    model_version: Mapped[str] = mapped_column(String(120), nullable=False)
    similar_species: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONVariant,
        default=list,
        server_default="[]",
        nullable=False,
    )
    raw_model_output: Mapped[dict[str, Any]] = mapped_column(
        JSONVariant,
        default=dict,
        server_default="{}",
        nullable=False,
    )
    needs_verification: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
