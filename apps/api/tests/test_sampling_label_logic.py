from decimal import Decimal

import pytest

from app.models.sampling_grid import SamplingLabel
from app.services.sampling_grid import SamplingGridGenerationService


@pytest.fixture
def sampling_service() -> SamplingGridGenerationService:
    return SamplingGridGenerationService(session=None)  # type: ignore[arg-type]


def label_for(
    sampling_service: SamplingGridGenerationService,
    *,
    observation_count: int,
    verified_count: int = 0,
    source_count: int = 1,
    recent_observation_count: int = 0,
    distance_to_road_m: Decimal | None = None,
    distance_to_trail_m: Decimal | None = None,
    distance_to_park_m: Decimal | None = None,
    road_trail_observation_ratio: Decimal = Decimal("0"),
    park_observation_ratio: Decimal = Decimal("0"),
) -> SamplingLabel:
    return sampling_service.assign_sampling_label(
        observation_count=observation_count,
        verified_count=verified_count,
        source_count=source_count,
        recent_observation_count=recent_observation_count,
        distance_to_road_m=distance_to_road_m,
        distance_to_trail_m=distance_to_trail_m,
        distance_to_park_m=distance_to_park_m,
        road_trail_observation_ratio=road_trail_observation_ratio,
        park_observation_ratio=park_observation_ratio,
    )


def test_well_sampled_label(sampling_service: SamplingGridGenerationService) -> None:
    assert (
        label_for(sampling_service, observation_count=6, verified_count=3, source_count=2)
        == SamplingLabel.well_sampled
    )


def test_moderately_sampled_label(sampling_service: SamplingGridGenerationService) -> None:
    assert label_for(sampling_service, observation_count=3) == SamplingLabel.moderately_sampled


def test_under_sampled_label(sampling_service: SamplingGridGenerationService) -> None:
    assert label_for(sampling_service, observation_count=1) == SamplingLabel.under_sampled


def test_road_trail_biased_label(sampling_service: SamplingGridGenerationService) -> None:
    assert (
        label_for(
            sampling_service,
            observation_count=4,
            road_trail_observation_ratio=Decimal("0.80"),
        )
        == SamplingLabel.road_trail_biased
    )


def test_park_biased_label(sampling_service: SamplingGridGenerationService) -> None:
    assert (
        label_for(
            sampling_service,
            observation_count=4,
            park_observation_ratio=Decimal("0.80"),
        )
        == SamplingLabel.park_biased
    )


def test_high_risk_under_sampled_label(sampling_service: SamplingGridGenerationService) -> None:
    assert (
        label_for(
            sampling_service,
            observation_count=1,
            distance_to_road_m=Decimal("90"),
        )
        == SamplingLabel.high_risk_under_sampled
    )


def test_needs_structured_survey_label(sampling_service: SamplingGridGenerationService) -> None:
    assert (
        label_for(
            sampling_service,
            observation_count=1,
            distance_to_park_m=Decimal("90"),
        )
        == SamplingLabel.needs_structured_survey
    )


def test_likely_false_absence_label(sampling_service: SamplingGridGenerationService) -> None:
    assert (
        label_for(
            sampling_service,
            observation_count=0,
            distance_to_trail_m=Decimal("80"),
        )
        == SamplingLabel.likely_false_absence
    )


def test_ambiguous_labels_use_priority_order(
    sampling_service: SamplingGridGenerationService,
) -> None:
    assert (
        label_for(
            sampling_service,
            observation_count=6,
            verified_count=3,
            source_count=2,
            road_trail_observation_ratio=Decimal("0.80"),
            park_observation_ratio=Decimal("0.80"),
        )
        == SamplingLabel.road_trail_biased
    )
