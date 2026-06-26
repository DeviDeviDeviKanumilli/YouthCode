from datetime import UTC, datetime
from decimal import Decimal

from app.models.environmental_context import EnvironmentalContext
from app.models.identification import AIIdentification, ConfidenceLabel
from app.models.observation import Observation
from app.services.component_scoring import (
    score_ecological_sensitivity,
    score_habitat_match,
    score_identity_confidence,
    score_local_novelty,
    score_nearby_verified_record_context,
    score_pathway_risk,
    score_sampling_gap_value,
    score_temporal_cluster,
    score_uncertainty_penalty,
)


def build_observation() -> Observation:
    return Observation(
        timestamp=datetime(2026, 6, 26, 12, 0, tzinfo=UTC),
        latitude=Decimal("40.7128"),
        longitude=Decimal("-74.0060"),
        coordinate_uncertainty_m=Decimal("150"),
        habitat_answers={"near_water": "yes"},
    )


def build_identification(confidence: str = "0.82") -> AIIdentification:
    return AIIdentification(
        candidate_scientific_name="Fallopia japonica",
        candidate_common_name="Japanese knotweed",
        confidence=Decimal(confidence),
        confidence_label=ConfidenceLabel.medium_high,
        model_name="mock",
        model_version="0.1",
    )


def build_context() -> EnvironmentalContext:
    return EnvironmentalContext(
        land_cover_class="developed_open_space",
        distance_to_water_m=Decimal("75"),
        distance_to_road_m=Decimal("90"),
        distance_to_trail_m=Decimal("180"),
        distance_to_park_m=Decimal("200"),
        data_sources={"provider": "test"},
        enrichment_version="test",
    )


def test_identity_confidence_handles_missing_input() -> None:
    result = score_identity_confidence(None)

    assert result.score == Decimal("0")
    assert result.reasons[0]["code"] == "missing_identification"


def test_identity_confidence_uses_ai_confidence() -> None:
    result = score_identity_confidence(build_identification("0.82"))

    assert result.score == Decimal("82.00")
    assert result.reasons[0]["code"] == "identity_confidence"


def test_local_novelty_scores_few_records_higher() -> None:
    assert score_local_novelty(0).score > score_local_novelty(8).score
    assert score_local_novelty(None).reasons[0]["code"] == "local_novelty_unknown"


def test_habitat_match_uses_answers_and_context() -> None:
    result = score_habitat_match(build_observation(), build_context())

    assert result.score == Decimal("80")
    assert result.reasons[0]["code"] == "habitat_match_high"


def test_pathway_risk_handles_missing_context() -> None:
    assert score_pathway_risk(None).score == Decimal("25")
    assert score_pathway_risk(build_context()).reasons[0]["code"] == "near_pathway"


def test_nearby_verified_record_context_scores_verified_records() -> None:
    assert score_nearby_verified_record_context(2).score == Decimal("75")
    assert score_nearby_verified_record_context(None).score == Decimal("0")


def test_ecological_sensitivity_uses_water_or_park_context() -> None:
    result = score_ecological_sensitivity(build_context())

    assert result.score == Decimal("70")
    assert result.reasons[0]["code"] == "ecological_sensitivity"


def test_sampling_gap_value_scores_under_sampled_area() -> None:
    assert score_sampling_gap_value(1).score == Decimal("80")
    assert score_sampling_gap_value(10).score == Decimal("20")


def test_temporal_cluster_scores_recent_cluster() -> None:
    assert score_temporal_cluster(3).score == Decimal("70")
    assert score_temporal_cluster(None).score == Decimal("0")


def test_uncertainty_penalty_combines_low_confidence_location_and_context() -> None:
    result = score_uncertainty_penalty(build_observation(), build_identification("0.40"), None)

    assert result.score > Decimal("25")
    reason_codes = {reason["code"] for reason in result.reasons}
    assert "low_confidence_warning" in reason_codes
    assert "high_coordinate_uncertainty" in reason_codes
    assert "missing_context_penalty" in reason_codes
