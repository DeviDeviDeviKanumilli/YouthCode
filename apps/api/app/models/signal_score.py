import uuid
from decimal import Decimal
from enum import StrEnum
from typing import Any

from sqlalchemy import Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import GUID, Base, JSONVariant, TimestampMixin


class SignalScoreLabel(StrEnum):
    low_signal = "low_signal"
    moderate_signal = "moderate_signal"
    high_value_verification_candidate = "high_value_verification_candidate"
    priority_ecological_signal = "priority_ecological_signal"
    insufficient_evidence = "insufficient_evidence"


class SignalScore(TimestampMixin, Base):
    __tablename__ = "signal_scores"

    observation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("observations.id", ondelete="CASCADE"),
        primary_key=True,
    )
    identity_confidence: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    local_novelty: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    habitat_match: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    pathway_risk: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    nearby_verified_record_context: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    ecological_sensitivity: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    sampling_gap_value: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    temporal_cluster_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    uncertainty_penalty: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    final_signal_priority: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    label: Mapped[SignalScoreLabel] = mapped_column(
        Enum(SignalScoreLabel, name="signal_score_label"),
        nullable=False,
    )
    reasons: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONVariant,
        default=list,
        server_default="[]",
        nullable=False,
    )
    model_version: Mapped[str] = mapped_column(String(120), nullable=False)
