import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import GUID, Base, TimestampMixin


class VerificationStatus(StrEnum):
    raw = "raw"
    ai_suggested = "ai_suggested"
    community_supported = "community_supported"
    expert_verified = "expert_verified"
    rejected = "rejected"
    needs_more_evidence = "needs_more_evidence"
    field_confirmed = "field_confirmed"


class Verification(TimestampMixin, Base):
    __tablename__ = "verification"

    observation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("observations.id", ondelete="CASCADE"),
        primary_key=True,
    )
    status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status"),
        default=VerificationStatus.raw,
        server_default=VerificationStatus.raw.value,
        index=True,
        nullable=False,
    )
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("users.id"),
        index=True,
    )
    reviewer_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_species_id: Mapped[uuid.UUID | None] = mapped_column(GUID(), ForeignKey("species.id"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
