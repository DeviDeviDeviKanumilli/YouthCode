from app.models.verification import VerificationStatus
from app.services.assistant_safety import (
    allowed_claims_for_observation,
    required_uncertainty_notice,
)


def test_verified_observations_allow_stronger_claims() -> None:
    claims = allowed_claims_for_observation(
        verification_status=VerificationStatus.expert_verified,
        has_identification=True,
        has_environmental_context=True,
        has_signal_score=True,
    )

    assert any("verified status" in claim for claim in claims)
    assert any("uncertainty" in claim for claim in claims)
    assert any("not as a population trend" in claim for claim in claims)
    assert "verification support" in required_uncertainty_notice(
        VerificationStatus.expert_verified
    )


def test_raw_ai_sightings_require_weaker_claims() -> None:
    claims = allowed_claims_for_observation(
        verification_status=VerificationStatus.ai_suggested,
        has_identification=True,
        has_environmental_context=False,
        has_signal_score=False,
    )

    assert any("AI-assisted species candidate" in claim for claim in claims)
    assert any("Do not describe the candidate as confirmed" in claim for claim in claims)
    assert not any("verified status" in claim for claim in claims)
    assert "not a confirmed identification" in required_uncertainty_notice(
        VerificationStatus.ai_suggested
    )


def test_missing_identification_requires_insufficient_evidence_language() -> None:
    claims = allowed_claims_for_observation(
        verification_status=VerificationStatus.raw,
        has_identification=False,
        has_environmental_context=False,
        has_signal_score=False,
    )

    assert any("insufficient evidence" in claim for claim in claims)
    assert any("Do not recommend chemical treatment" in claim for claim in claims)
    assert any("Do not treat missing sightings as true absence" in claim for claim in claims)
