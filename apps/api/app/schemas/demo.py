import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict

DemoScenarioID = Literal[
    "student_knotweed_near_creek",
    "resident_low_priority_park",
    "student_under_sampled_survey",
]


class DemoObservedOutputs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    possible_species: str | None
    confidence_label: str | None
    signal_label: str | None
    verification_status: str
    sampling_label: str | None
    final_signal_priority: str | None
    sampling_gap_value: str | None
    map_layers: list[str]
    corridor_type: str | None


class DemoScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: DemoScenarioID
    title: str
    persona: str
    script_steps: list[str]
    seeded_observation_id: uuid.UUID
    map_query: dict[str, str]
    expected_outputs: dict[str, str | bool]
    observed_outputs: DemoObservedOutputs
    assertions: dict[str, bool]
    deterministic: bool


class DemoScenarioList(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scenarios: list[DemoScenario]
