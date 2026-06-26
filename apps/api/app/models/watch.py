import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import GUID, Base, JSONVariant, TimestampMixin, UUIDPrimaryKeyMixin


class WatchAssetEntityType(StrEnum):
    species = "species"
    place = "place"


class SpeciesWatchProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "species_watch_profiles"

    species_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("species.id"),
        index=True,
        nullable=False,
    )
    region_code: Mapped[str | None] = mapped_column(String(32), index=True, nullable=True)
    state_code: Mapped[str | None] = mapped_column(String(8), index=True, nullable=True)
    watch_label: Mapped[str] = mapped_column(String(120), nullable=False)
    public_summary: Mapped[str] = mapped_column(Text, nullable=False)
    active_months: Mapped[list[int]] = mapped_column(
        JSONVariant,
        default=list,
        server_default="[]",
        nullable=False,
    )
    habitat_tags: Mapped[list[str]] = mapped_column(
        JSONVariant,
        default=list,
        server_default="[]",
        nullable=False,
    )
    pathway_tags: Mapped[list[str]] = mapped_column(
        JSONVariant,
        default=list,
        server_default="[]",
        nullable=False,
    )
    visual_clues: Mapped[list[str]] = mapped_column(
        JSONVariant,
        default=list,
        server_default="[]",
        nullable=False,
    )
    photo_tips: Mapped[list[str]] = mapped_column(
        JSONVariant,
        default=list,
        server_default="[]",
        nullable=False,
    )
    lookalike_notes: Mapped[list[str]] = mapped_column(
        JSONVariant,
        default=list,
        server_default="[]",
        nullable=False,
    )
    priority_base: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        default=Decimal("50.00"),
        server_default="50",
        nullable=False,
    )
    is_invasive_concern: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
    )
    is_seasonal: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
    )
    is_tree_pest: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
    )
    is_aquatic: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
    )


class WatchAssetImage(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "watch_asset_images"

    entity_type: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(GUID(), index=True, nullable=True)
    place_type: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    alt_text: Mapped[str] = mapped_column(String(255), nullable=False)
    credit: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )


class WatchResponseCache(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "watch_response_cache"

    cache_key: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    lat_bucket: Mapped[Decimal] = mapped_column(Numeric(9, 4), nullable=False)
    lon_bucket: Mapped[Decimal] = mapped_column(Numeric(9, 4), nullable=False)
    radius_km: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    response_json: Mapped[dict[str, Any]] = mapped_column(
        JSONVariant,
        default=dict,
        server_default="{}",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
        nullable=False,
    )
