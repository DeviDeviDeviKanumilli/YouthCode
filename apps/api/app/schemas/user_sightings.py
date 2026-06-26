import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserObservationListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observation_id: uuid.UUID
    thumbnail_url: str | None
    possible_species: str | None
    signal_label: str | None
    verification_status: str
    created_at: datetime
