from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.observation import Observation, ObservationSource
from app.repositories.identifications import IdentificationRepository
from app.repositories.sampling_grid import SamplingGridRepository
from app.repositories.signal_scores import SignalScoreRepository
from app.repositories.verification import VerificationRepository
from app.schemas.demo import DemoObservedOutputs, DemoScenario, DemoScenarioID, DemoScenarioList
from app.services.forecast import ForecastService

DEMO_BBOX = "-74.03,40.69,-73.98,40.75"


@dataclass(frozen=True)
class DemoScenarioDefinition:
    id: DemoScenarioID
    seed_key: str
    title: str
    persona: str
    script_steps: list[str]
    expected_outputs: dict[str, str | bool]


SCENARIOS: tuple[DemoScenarioDefinition, ...] = (
    DemoScenarioDefinition(
        id="student_knotweed_near_creek",
        seed_key="student_creek",
        title="Student uploads possible Japanese knotweed near creek",
        persona="student",
        script_steps=[
            "Open the public map around Demo Creek.",
            "Submit the seeded creek observation.",
            "Review the returned identity, signal, and corridor context.",
        ],
        expected_outputs={
            "confidence_label": "medium_high",
            "near_waterway": True,
            "signal_label": "high_value_verification_candidate",
            "corridor_type": "waterway",
        },
    ),
    DemoScenarioDefinition(
        id="resident_low_priority_park",
        seed_key="well_sampled_park",
        title="Resident uploads common low-priority sighting in well-sampled park",
        persona="resident",
        script_steps=[
            "Open the public map around Demo Park.",
            "Submit the seeded park observation.",
            "Review the lower signal and nearby known record context.",
        ],
        expected_outputs={
            "signal_label": "moderate_signal",
            "known_nearby_records": True,
            "sampling_label": "well_sampled",
        },
    ),
    DemoScenarioDefinition(
        id="student_under_sampled_survey",
        seed_key="under_sampled_survey",
        title="Student survey in under-sampled area",
        persona="student",
        script_steps=[
            "Open the research map around the PA demo cell.",
            "Submit the seeded survey observation.",
            "Review sampling gap value and verification queue priority.",
        ],
        expected_outputs={
            "sampling_gap_value_high": True,
            "sampling_label": "needs_structured_survey",
            "researcher_queue_priority": True,
        },
    ),
)


class DemoScenarioService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.identifications = IdentificationRepository(session)
        self.signal_scores = SignalScoreRepository(session)
        self.verification = VerificationRepository(session)
        self.sampling_grid = SamplingGridRepository(session)
        self.forecast = ForecastService(session)

    async def list_scenarios(self) -> DemoScenarioList:
        return DemoScenarioList(
            scenarios=[await self._scenario(definition) for definition in SCENARIOS]
        )

    async def get_scenario(self, scenario_id: DemoScenarioID) -> DemoScenario:
        definition = next((item for item in SCENARIOS if item.id == scenario_id), None)
        if definition is None:
            raise AppError(
                code="demo_scenario_not_found",
                message="Demo scenario was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return await self._scenario(definition)

    async def _scenario(self, definition: DemoScenarioDefinition) -> DemoScenario:
        observation = await self._observation_for_seed_key(definition.seed_key)
        identification = await self.identifications.list_for_observation(observation.id)
        latest_identification = identification[0] if identification else None
        score = await self.signal_scores.get(observation.id)
        verification = await self.verification.ensure_raw(observation.id)
        sampling_cell = await self.sampling_grid.find_cell_for_point(
            latitude=observation.latitude,
            longitude=observation.longitude,
            region_code=observation.region_code,
        )
        forecast = await self.forecast.public_forecast(
            bbox=DEMO_BBOX,
            latitude=None,
            longitude=None,
            radius_km=None,
            species_id=None,
            signal_type=None,
            verification_status=None,
            from_date=None,
            to_date=None,
            recent_days=None,
        )
        map_layers = sorted({feature.properties["layer"] for feature in forecast.features})
        corridor_type = self._corridor_type_for_observation(forecast, observation)
        observed_outputs = DemoObservedOutputs(
            possible_species=(
                latest_identification.candidate_common_name
                or latest_identification.candidate_scientific_name
                if latest_identification
                else None
            ),
            confidence_label=(
                latest_identification.confidence_label.value if latest_identification else None
            ),
            signal_label=score.label.value if score else None,
            verification_status=verification.status.value,
            sampling_label=sampling_cell.sampling_label.value if sampling_cell else None,
            final_signal_priority=str(score.final_signal_priority) if score else None,
            sampling_gap_value=str(score.sampling_gap_value) if score else None,
            map_layers=map_layers,
            corridor_type=corridor_type,
        )
        return DemoScenario(
            id=definition.id,
            title=definition.title,
            persona=definition.persona,
            script_steps=definition.script_steps,
            seeded_observation_id=observation.id,
            map_query={"bbox": DEMO_BBOX},
            expected_outputs=definition.expected_outputs,
            observed_outputs=observed_outputs,
            assertions=self._assertions(definition, observed_outputs, map_layers),
            deterministic=True,
        )

    async def _observation_for_seed_key(self, seed_key: str) -> Observation:
        result = await self.session.execute(
            select(Observation)
            .where(Observation.source == ObservationSource.demo_seed)
            .order_by(Observation.timestamp.desc())
        )
        for observation in result.scalars().all():
            if observation.habitat_answers.get("scenario") == seed_key:
                return observation
        raise AppError(
            code="demo_seed_not_found",
            message="Run the seed command before loading demo scenarios.",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    def _corridor_type_for_observation(
        self,
        forecast: Any,
        observation: Observation,
    ) -> str | None:
        for feature in forecast.features:
            if (
                feature.properties.get("layer") == "possible_corridors"
                and feature.properties.get("observation_id") == str(observation.id)
            ):
                corridor_type = feature.properties.get("corridor_type")
                return str(corridor_type) if corridor_type is not None else None
        return None

    def _assertions(
        self,
        definition: DemoScenarioDefinition,
        observed_outputs: DemoObservedOutputs,
        map_layers: list[str],
    ) -> dict[str, bool]:
        expected = definition.expected_outputs
        assertions: dict[str, bool] = {}
        for key, expected_value in expected.items():
            assertions[key] = self._matches_expected(
                key=key,
                expected_value=expected_value,
                observed_outputs=observed_outputs,
                map_layers=map_layers,
            )
        return assertions

    def _matches_expected(
        self,
        *,
        key: str,
        expected_value: str | bool,
        observed_outputs: DemoObservedOutputs,
        map_layers: list[str],
    ) -> bool:
        if key == "near_waterway":
            return "waterways" in map_layers and observed_outputs.corridor_type == "waterway"
        if key == "known_nearby_records":
            return "known_records" in map_layers
        if key == "sampling_gap_value_high":
            if observed_outputs.sampling_gap_value is None:
                return False
            return Decimal(observed_outputs.sampling_gap_value) >= Decimal("75.00")
        if key == "researcher_queue_priority":
            return observed_outputs.signal_label in {
                "high_value_verification_candidate",
                "priority_ecological_signal",
            }
        observed_value = getattr(observed_outputs, key, None)
        return observed_value == expected_value
