import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr | None = None
    display_name: str | None = Field(default=None, max_length=120)
    role: UserRole = UserRole.consumer
    school_or_org: str | None = Field(default=None, max_length=200)
    privacy_settings: dict[str, Any] = Field(default_factory=dict)


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr | None = None
    display_name: str | None = Field(default=None, max_length=120)
    role: UserRole | None = None
    school_or_org: str | None = Field(default=None, max_length=200)
    trusted_reviewer_status: bool | None = None
    privacy_settings: dict[str, Any] | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    email: EmailStr | None
    display_name: str | None
    role: UserRole
    school_or_org: str | None
    trusted_reviewer_status: bool
    privacy_settings: dict[str, Any]
    created_at: datetime
    updated_at: datetime
