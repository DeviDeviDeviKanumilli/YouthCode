import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import GUID, Base, JSONVariant, TimestampMixin, UUIDPrimaryKeyMixin


class ObservationSource(StrEnum):
    consumer_app = "consumer_app"
    research_dashboard = "research_dashboard"
    import_ = "import"
    demo_seed = "demo_seed"


class PrivacyLevel(StrEnum):
    public = "public"
    obscured = "obscured"
    private = "private"


class Observation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "observations"
    __table_args__ = (
        CheckConstraint("latitude >= -90 AND latitude <= 90", name="latitude_range"),
        CheckConstraint("longitude >= -180 AND longitude <= 180", name="longitude_range"),
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(GUID(), ForeignKey("users.id"), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    coordinate_uncertainty_m: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    geom: Mapped[str | None] = mapped_column(
        String().with_variant(
            Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
            "postgresql",
        ),
        nullable=True,
    )
    region_code: Mapped[str | None] = mapped_column(String(32), index=True, nullable=True)
    source: Mapped[ObservationSource] = mapped_column(
        Enum(
            ObservationSource,
            name="observation_source",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=ObservationSource.consumer_app,
        server_default=ObservationSource.consumer_app.value,
        index=True,
        nullable=False,
    )
    raw_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    habitat_answers: Mapped[dict[str, Any]] = mapped_column(
        JSONVariant,
        default=dict,
        server_default="{}",
        nullable=False,
    )
    survey_session_id: Mapped[uuid.UUID | None] = mapped_column(GUID(), nullable=True)
    privacy_level: Mapped[PrivacyLevel] = mapped_column(
        Enum(PrivacyLevel, name="privacy_level"),
        default=PrivacyLevel.public,
        server_default=PrivacyLevel.public.value,
        index=True,
        nullable=False,
    )
