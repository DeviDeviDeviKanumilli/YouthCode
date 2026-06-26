from decimal import Decimal
from uuid import uuid4

from app.models.signal_score import SignalScore, SignalScoreLabel
from app.services.score_explanations import ScoreExplanationService


def build_score(label: SignalScoreLabel = SignalScoreLabel.moderate_signal) -> SignalScore:
    return SignalScore(
        observation_id=uuid4(),
        identity_confidence=Decimal("80.00"),
        local_novelty=Decimal("60.00"),
        habitat_match=Decimal("75.00"),
        pathway_risk=Decimal("70.00"),
        nearby_verified_record_context=Decimal("75.00"),
        ecological_sensitivity=Decimal("70.00"),
        sampling_gap_value=Decimal("80.00"),
        temporal_cluster_score=Decimal("15.00"),
        uncertainty_penalty=Decimal("10.00"),
        final_signal_priority=Decimal("58.00"),
        label=label,
        reasons=[
            {"code": "identity_confidence", "summary": "Candidate confidence is medium high."},
            {"code": "near_pathway", "summary": "Near a pathway."},
            {"code": "under_sampled_area", "summary": "Under-sampled area."},
        ],
        model_version="test",
    )


def test_explanation_includes_reason_codes_and_research_components() -> None:
    explanation = ScoreExplanationService().explain(build_score())

    assert explanation.reason_codes == [
        "identity_confidence",
        "near_pathway",
        "under_sampled_area",
    ]
    assert "possible ecological signal" in explanation.public_explanation
    assert "not a confirmed finding" in explanation.public_explanation
    assert "identity_confidence=80.00" in explanation.researcher_explanation
    assert "uncertainty_penalty=10.00" in explanation.researcher_explanation


def test_insufficient_evidence_explanation_avoids_overclaiming() -> None:
    score = build_score(SignalScoreLabel.insufficient_evidence)

    explanation = ScoreExplanationService().explain(score)

    assert "not enough evidence" in explanation.public_explanation
    assert "confirmed" not in explanation.public_explanation.lower().replace(
        "not a confirmed",
        "",
    )
