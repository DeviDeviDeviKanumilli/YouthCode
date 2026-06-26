import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.signal_score import SignalScoreLabel


class SignalScoreExplanation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observation_id: uuid.UUID
    label: SignalScoreLabel
    final_signal_priority: Decimal
    reason_codes: list[str]
    public_explanation: str
    researcher_explanation: str
