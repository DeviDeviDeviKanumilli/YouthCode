from app.models.verification import VerificationStatus

VERIFIED_STATUSES = {
    VerificationStatus.expert_verified,
    VerificationStatus.field_confirmed,
}

PROHIBITED_ASSISTANT_CLAIMS = [
    "Do not claim expert confirmation without a verification status.",
    "Do not recommend chemical treatment or unsafe species handling.",
    "Do not overstate population trends from casual sightings.",
    "Do not treat missing sightings as true absence.",
]


def allowed_claims_for_observation(
    *,
    verification_status: VerificationStatus,
    has_identification: bool,
    has_environmental_context: bool,
    has_signal_score: bool,
) -> list[str]:
    claims = ["State that uncertainty remains and cite the internal data sources used."]
    if verification_status in VERIFIED_STATUSES:
        claims.append("This observation may be described using its verified status.")
    elif has_identification:
        claims.append("This observation may be described as an AI-assisted species candidate.")
        claims.append("Do not describe the candidate as confirmed or expert verified.")
    else:
        claims.append("Say there is insufficient evidence for a species-level claim.")
    if has_environmental_context:
        claims.append(
            "Environmental context may be summarized as supporting context, not proof."
        )
    if has_signal_score:
        claims.append("Signal score may be used for prioritization, not as a population trend.")
    claims.extend(PROHIBITED_ASSISTANT_CLAIMS)
    return claims


def required_uncertainty_notice(verification_status: VerificationStatus) -> str:
    if verification_status in VERIFIED_STATUSES:
        return (
            "This observation has verification support, but assistant responses must still "
            "state uncertainty for model-derived context and avoid treatment advice."
        )
    return (
        "This is not a confirmed identification. Assistant responses must present it as "
        "AI-assisted evidence, state uncertainty, and avoid treatment or handling advice."
    )
