import uuid
from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class TaxonomyMatchType(StrEnum):
    scientific_name = "scientific_name"
    common_name = "common_name"
    synonym = "synonym"


class TaxonomyNormalizationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    species_id: uuid.UUID | None
    matched_by: TaxonomyMatchType | None
    resolved_scientific_name: str | None
    resolved_common_name: str | None
    unresolved_candidate_scientific_name: str | None
    unresolved_candidate_common_name: str | None
