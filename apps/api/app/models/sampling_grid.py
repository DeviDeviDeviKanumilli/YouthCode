from decimal import Decimal
from enum import StrEnum
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import Enum, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, JSONVariant, TimestampMixin, UUIDPrimaryKeyMixin


class SamplingLabel(StrEnum):
    well_sampled = "well_sampled"
    moderately_sampled = "moderately_sampled"
    under_sampled = "under_sampled"
    road_trail_biased = "road_trail_biased"
    park_biased = "park_biased"
    high_risk_under_sampled = "high_risk_under_sampled"
    needs_structured_survey = "needs_structured_survey"
    likely_false_absence = "likely_false_absence"


class SamplingGridCell(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "sampling_grid_cells"

    region_code: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    geom: Mapped[str] = mapped_column(
        String().with_variant(
            Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True),
            "postgresql",
        ),
        nullable=False,
    )
    min_latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    min_longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    max_latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    max_longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    observation_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    verified_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    recent_observation_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    distance_to_road_m: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    distance_to_trail_m: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    distance_to_park_m: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    risk_context: Mapped[dict[str, Any]] = mapped_column(
        JSONVariant,
        default=dict,
        server_default="{}",
        nullable=False,
    )
    sampling_label: Mapped[SamplingLabel] = mapped_column(
        Enum(SamplingLabel, name="sampling_label"),
        index=True,
        nullable=False,
    )
