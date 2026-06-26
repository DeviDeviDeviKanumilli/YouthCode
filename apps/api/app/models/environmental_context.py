import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import GUID, Base, JSONVariant, TimestampMixin


class EnvironmentalContext(TimestampMixin, Base):
    __tablename__ = "environmental_context"

    observation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("observations.id", ondelete="CASCADE"),
        primary_key=True,
    )
    land_cover_class: Mapped[str | None] = mapped_column(String(120), nullable=True)
    tree_canopy_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    impervious_surface_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    ndvi_value: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    distance_to_water_m: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    distance_to_road_m: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    distance_to_trail_m: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    distance_to_park_m: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    elevation_m: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    slope: Mapped[Decimal | None] = mapped_column(Numeric(8, 4), nullable=True)
    recent_precipitation: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    recent_temperature: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    data_sources: Mapped[dict[str, Any]] = mapped_column(
        JSONVariant,
        default=dict,
        server_default="{}",
        nullable=False,
    )
    enrichment_version: Mapped[str] = mapped_column(String(120), nullable=False)
