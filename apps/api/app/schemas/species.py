import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SpeciesCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scientific_name: str = Field(min_length=1, max_length=255)
    common_name: str | None = Field(default=None, max_length=255)
    common_names: list[str] = Field(default_factory=list)
    gbif_taxon_id: int | None = None
    inat_taxon_id: int | None = None
    nas_id: str | None = Field(default=None, max_length=80)
    kingdom: str | None = Field(default=None, max_length=80)
    taxon_rank: str | None = Field(default=None, max_length=80)
    native_status_by_state: dict[str, Any] = Field(default_factory=dict)
    invasive_status_by_state: dict[str, Any] = Field(default_factory=dict)
    synonyms: list[str] = Field(default_factory=list)


class SpeciesUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scientific_name: str | None = Field(default=None, min_length=1, max_length=255)
    common_name: str | None = Field(default=None, max_length=255)
    common_names: list[str] | None = None
    gbif_taxon_id: int | None = None
    inat_taxon_id: int | None = None
    nas_id: str | None = Field(default=None, max_length=80)
    kingdom: str | None = Field(default=None, max_length=80)
    taxon_rank: str | None = Field(default=None, max_length=80)
    native_status_by_state: dict[str, Any] | None = None
    invasive_status_by_state: dict[str, Any] | None = None
    synonyms: list[str] | None = None


class SpeciesRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: uuid.UUID
    scientific_name: str
    common_name: str | None
    common_names: list[str]
    gbif_taxon_id: int | None
    inat_taxon_id: int | None
    nas_id: str | None
    kingdom: str | None
    taxon_rank: str | None
    native_status_by_state: dict[str, Any]
    invasive_status_by_state: dict[str, Any]
    synonyms: list[str]
    created_at: datetime
    updated_at: datetime
