import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class PossibleSpecies(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scientific_name: str | None = None
    common_name: str | None = None


class SightingIntelligenceCard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observation_id: uuid.UUID
    possible_species: PossibleSpecies | None
    confidence: Decimal | None
    confidence_label: str | None
    similar_species_warning: str | None
    local_status: str
    known_nearby_records_summary: str
    habitat_match_summary: str
    pathway_summary: str
    sampling_value_summary: str
    verification_status: str
    signal_priority: Decimal | None
    signal_label: str | None
    plain_language_explanation: str
    uncertainty_notice: str
    data_sources_used: list[str]
