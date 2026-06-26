from decimal import Decimal

import pytest

from app.models.signal_score import SignalScoreLabel
from app.services.scoring_model import (
    SCORING_WEIGHTS,
    calculate_signal_priority,
    label_for_score,
    scoring_weight_total,
)


def full_components(value: str = "50") -> dict[str, Decimal]:
    return {component: Decimal(value) for component in SCORING_WEIGHTS}


def test_scoring_weights_sum_to_one() -> None:
    assert scoring_weight_total() == Decimal("1.00")


def test_label_thresholds() -> None:
    assert label_for_score(Decimal("25")) == SignalScoreLabel.low_signal
    assert label_for_score(Decimal("25.01")) == SignalScoreLabel.moderate_signal
    assert label_for_score(Decimal("50")) == SignalScoreLabel.moderate_signal
    assert label_for_score(Decimal("50.01")) == SignalScoreLabel.high_value_verification_candidate
    assert label_for_score(Decimal("75")) == SignalScoreLabel.high_value_verification_candidate
    assert label_for_score(Decimal("75.01")) == SignalScoreLabel.priority_ecological_signal


def test_insufficient_evidence_overrides_numeric_label() -> None:
    result = calculate_signal_priority(
        full_components("100"),
        uncertainty_penalty=Decimal("0"),
        insufficient_evidence=True,
    )

    assert result.final_signal_priority == Decimal("100.00")
    assert result.label == SignalScoreLabel.insufficient_evidence


def test_formula_is_deterministic() -> None:
    components = full_components("70")

    first = calculate_signal_priority(components, uncertainty_penalty=Decimal("12.5"))
    second = calculate_signal_priority(components, uncertainty_penalty=Decimal("12.5"))

    assert second == first
    assert first.final_signal_priority == Decimal("57.50")


def test_uncertainty_penalty_cannot_make_score_below_zero() -> None:
    result = calculate_signal_priority(
        full_components("10"),
        uncertainty_penalty=Decimal("500"),
    )

    assert result.final_signal_priority == Decimal("0.00")
    assert result.label == SignalScoreLabel.low_signal


def test_score_cannot_exceed_one_hundred() -> None:
    result = calculate_signal_priority(
        full_components("100"),
        uncertainty_penalty=Decimal("-25"),
    )

    assert result.final_signal_priority == Decimal("100.00")
    assert result.label == SignalScoreLabel.priority_ecological_signal


def test_missing_component_rejected() -> None:
    components = full_components("50")
    components.pop("pathway_risk")

    with pytest.raises(ValueError, match="pathway_risk"):
        calculate_signal_priority(components, uncertainty_penalty=Decimal("0"))
