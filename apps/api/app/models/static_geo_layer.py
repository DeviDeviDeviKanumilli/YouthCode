import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import GUID, Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.verification import VerificationStatus


class RoadTrailType(StrEnum):
    road = "road"
    trail = "trail"


class StaticWaterway(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "waterways"

    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    geom: Mapped[str] = mapped_column(
        String().with_variant(
            Geometry(geometry_type="MULTILINESTRING", srid=4326, spatial_index=True),
            "postgresql",
        ),
        nullable=False,
    )
    representative_latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    representative_longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)


class StaticRoadTrail(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "roads_trails"

    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    type: Mapped[RoadTrailType] = mapped_column(
        Enum(RoadTrailType, name="road_trail_type"),
        index=True,
        nullable=False,
    )
    geom: Mapped[str] = mapped_column(
        String().with_variant(
            Geometry(geometry_type="MULTILINESTRING", srid=4326, spatial_index=True),
            "postgresql",
        ),
        nullable=False,
    )
    representative_latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    representative_longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)


class StaticPark(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "parks"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    geom: Mapped[str] = mapped_column(
        String().with_variant(
            Geometry(geometry_type="MULTIPOLYGON", srid=4326, spatial_index=True),
            "postgresql",
        ),
        nullable=False,
    )
    representative_latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    representative_longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)


class KnownRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "known_records"

    species_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("species.id"),
        index=True,
        nullable=False,
    )
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status"),
        index=True,
        nullable=False,
    )
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    geom: Mapped[str] = mapped_column(
        String().with_variant(
            Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
            "postgresql",
        ),
        nullable=False,
    )
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
