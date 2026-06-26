import uuid

from sqlalchemy import Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import GUID, Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.verification import VerificationStatus


class VerificationEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "verification_events"

    observation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("observations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    previous_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status"),
        nullable=False,
    )
    new_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status"),
        nullable=False,
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
