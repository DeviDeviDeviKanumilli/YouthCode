from collections.abc import Mapping
from dataclasses import dataclass
from decimal import Decimal

from app.models.signal_score import SignalScoreLabel

MODEL_VERSION = "m6.1-rules-0.1.0"

SCORING_WEIGHTS: dict[str, Decimal] = {
    "identity_confidence": Decimal("0.20"),
    "local_novelty": Decimal("0.15"),
    "habitat_match": Decimal("0.15"),
    "pathway_risk": Decimal("0.15"),
    "nearby_verified_record_context": Decimal("0.10"),
    "ecological_sensitivity": Decimal("0.10"),
    "sampling_gap_value": Decimal("0.10"),
    "temporal_cluster_score": Decimal("0.05"),
}

LOW_SIGNAL_MAX = Decimal("25")
MODERATE_SIGNAL_MAX = Decimal("50")
HIGH_VALUE_SIGNAL_MAX = Decimal("75")


@dataclass(frozen=True)
class ScoringModelResult:
    final_signal_priority: Decimal
    label: SignalScoreLabel


def scoring_weight_total() -> Decimal:
    return sum(SCORING_WEIGHTS.values(), Decimal("0"))


def label_for_score(score: Decimal, insufficient_evidence: bool = False) -> SignalScoreLabel:
    if insufficient_evidence:
        return SignalScoreLabel.insufficient_evidence
    if score <= LOW_SIGNAL_MAX:
        return SignalScoreLabel.low_signal
    if score <= MODERATE_SIGNAL_MAX:
        return SignalScoreLabel.moderate_signal
    if score <= HIGH_VALUE_SIGNAL_MAX:
        return SignalScoreLabel.high_value_verification_candidate
    return SignalScoreLabel.priority_ecological_signal


def calculate_signal_priority(
    components: Mapping[str, Decimal],
    *,
    uncertainty_penalty: Decimal,
    insufficient_evidence: bool = False,
) -> ScoringModelResult:
    missing_components = set(SCORING_WEIGHTS) - set(components)
    if missing_components:
        missing = ", ".join(sorted(missing_components))
        raise ValueError(f"Missing scoring components: {missing}")

    weighted_score = Decimal("0")
    for component_name, weight in SCORING_WEIGHTS.items():
        weighted_score += _bounded_score(components[component_name], component_name) * weight
    weighted_score -= max(Decimal("0"), uncertainty_penalty)
    final_score = _clamp_score(weighted_score).quantize(Decimal("0.01"))
    return ScoringModelResult(
        final_signal_priority=final_score,
        label=label_for_score(final_score, insufficient_evidence),
    )


def _bounded_score(value: Decimal, component_name: str) -> Decimal:
    if value < Decimal("0") or value > Decimal("100"):
        raise ValueError(f"{component_name} must be between 0 and 100.")
    return value


def _clamp_score(value: Decimal) -> Decimal:
    return min(Decimal("100"), max(Decimal("0"), value))
