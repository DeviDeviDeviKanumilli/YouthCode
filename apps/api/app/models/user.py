from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, Boolean, Enum, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

JSONVariant = JSON().with_variant(JSONB, "postgresql")


class UserRole(StrEnum):
    consumer = "consumer"
    researcher = "researcher"
    reviewer = "reviewer"
    admin = "admin"


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str | None] = mapped_column(String(320), unique=True, nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        default=UserRole.consumer,
        server_default=UserRole.consumer.value,
        index=True,
        nullable=False,
    )
    school_or_org: Mapped[str | None] = mapped_column(String(200), nullable=True)
    trusted_reviewer_status: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
    )
    privacy_settings: Mapped[dict[str, Any]] = mapped_column(
        MutableDict.as_mutable(JSONVariant),
        default=dict,
        server_default="{}",
        nullable=False,
    )
