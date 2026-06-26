from typing import Any

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, JSONVariant, TimestampMixin, UUIDPrimaryKeyMixin


class Species(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "species"

    scientific_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    common_name: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    common_names: Mapped[list[str]] = mapped_column(
        JSONVariant,
        default=list,
        server_default="[]",
        nullable=False,
    )
    gbif_taxon_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    inat_taxon_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    nas_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    kingdom: Mapped[str | None] = mapped_column(String(80), nullable=True)
    taxon_rank: Mapped[str | None] = mapped_column(String(80), nullable=True)
    native_status_by_state: Mapped[dict[str, Any]] = mapped_column(
        JSONVariant,
        default=dict,
        server_default="{}",
        nullable=False,
    )
    invasive_status_by_state: Mapped[dict[str, Any]] = mapped_column(
        JSONVariant,
        default=dict,
        server_default="{}",
        nullable=False,
    )
    synonyms: Mapped[list[str]] = mapped_column(
        JSONVariant,
        default=list,
        server_default="[]",
        nullable=False,
    )
