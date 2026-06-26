from dataclasses import dataclass, field
from decimal import Decimal

from app.models.environmental_context import EnvironmentalContext
from app.models.identification import AIIdentification
from app.models.observation import Observation


@dataclass(frozen=True)
class ComponentScore:
    score: Decimal
    reasons: list[dict[str, str]] = field(default_factory=list)


def score_identity_confidence(identification: AIIdentification | None) -> ComponentScore:
    if identification is None:
        return ComponentScore(
            score=Decimal("0"),
            reasons=[
                {
                    "code": "missing_identification",
                    "summary": "No AI-assisted candidate identification is available yet.",
                }
            ],
        )
    confidence = (identification.confidence * Decimal("100")).quantize(Decimal("0.01"))
    return ComponentScore(
        score=confidence,
        reasons=[
            {
                "code": "identity_confidence",
                "summary": f"Candidate confidence is {identification.confidence_label}.",
            }
        ],
    )


def score_local_novelty(nearby_record_count: int | None) -> ComponentScore:
    if nearby_record_count is None:
        return ComponentScore(
            score=Decimal("40"),
            reasons=[
                {
                    "code": "local_novelty_unknown",
                    "summary": "Nearby record context is not available yet.",
                }
            ],
        )
    if nearby_record_count == 0:
        return ComponentScore(
            score=Decimal("85"),
            reasons=[
                {
                    "code": "few_nearby_records",
                    "summary": "No similar nearby records are currently known.",
                }
            ],
        )
    if nearby_record_count <= 2:
        return ComponentScore(
            score=Decimal("60"),
            reasons=[
                {
                    "code": "limited_nearby_records",
                    "summary": "Only a few similar nearby records are currently known.",
                }
            ],
        )
    return ComponentScore(
        score=Decimal("25"),
        reasons=[
            {
                "code": "nearby_records_present",
                "summary": "Similar nearby records are already present.",
            }
        ],
    )


def score_habitat_match(
    observation: Observation,
    context: EnvironmentalContext | None,
) -> ComponentScore:
    if context is None:
        return ComponentScore(
            score=Decimal("25"),
            reasons=[
                {
                    "code": "missing_environmental_context",
                    "summary": "Environmental context is not available yet.",
                }
            ],
        )
    near_water_answer = observation.habitat_answers.get("near_water") == "yes"
    near_water_context = (
        context.distance_to_water_m is not None and context.distance_to_water_m <= Decimal("100")
    )
    if near_water_answer and near_water_context:
        return ComponentScore(
            score=Decimal("80"),
            reasons=[
                {
                    "code": "habitat_match_high",
                    "summary": (
                        "Habitat answers and environmental context both suggest nearby water."
                    ),
                }
            ],
        )
    return ComponentScore(
        score=Decimal("60"),
        reasons=[
            {
                "code": "environmental_context_available",
                "summary": "Environmental context is available for scoring.",
            }
        ],
    )


def score_pathway_risk(context: EnvironmentalContext | None) -> ComponentScore:
    if context is None:
        return ComponentScore(
            score=Decimal("25"),
            reasons=[
                {
                    "code": "pathway_context_missing",
                    "summary": "Road, trail, and waterway distances are not available yet.",
                }
            ],
        )
    distances = [
        context.distance_to_water_m,
        context.distance_to_road_m,
        context.distance_to_trail_m,
    ]
    nearby_pathway = any(
        distance is not None and distance <= Decimal("100") for distance in distances
    )
    if nearby_pathway:
        return ComponentScore(
            score=Decimal("75"),
            reasons=[
                {
                    "code": "near_pathway",
                    "summary": "The sighting is near a waterway, road, or trail.",
                }
            ],
        )
    return ComponentScore(
        score=Decimal("35"),
        reasons=[
            {
                "code": "pathway_risk_lower",
                "summary": "No nearby waterway, road, or trail was identified.",
            }
        ],
    )


def score_nearby_verified_record_context(verified_record_count: int | None) -> ComponentScore:
    if verified_record_count is None:
        return ComponentScore(
            score=Decimal("0"),
            reasons=[
                {
                    "code": "nearby_verified_records_unknown",
                    "summary": "Nearby verified record context is not available yet.",
                }
            ],
        )
    if verified_record_count > 0:
        return ComponentScore(
            score=Decimal("75"),
            reasons=[
                {
                    "code": "nearby_verified_records",
                    "summary": "Similar verified records exist nearby.",
                }
            ],
        )
    return ComponentScore(
        score=Decimal("20"),
        reasons=[
            {
                "code": "no_nearby_verified_records",
                "summary": "No similar verified nearby records are currently known.",
            }
        ],
    )


def score_ecological_sensitivity(context: EnvironmentalContext | None) -> ComponentScore:
    if context is None:
        return ComponentScore(
            score=Decimal("30"),
            reasons=[
                {
                    "code": "sensitivity_context_missing",
                    "summary": "Sensitive habitat context is not available yet.",
                }
            ],
        )
    near_sensitive_area = (
        context.distance_to_water_m is not None and context.distance_to_water_m <= Decimal("250")
    ) or (context.distance_to_park_m is not None and context.distance_to_park_m <= Decimal("250"))
    if near_sensitive_area:
        return ComponentScore(
            score=Decimal("70"),
            reasons=[
                {
                    "code": "ecological_sensitivity",
                    "summary": "The sighting is near a waterway or park context layer.",
                }
            ],
        )
    return ComponentScore(
        score=Decimal("30"),
        reasons=[
            {
                "code": "ecological_sensitivity_lower",
                "summary": "No nearby sensitive context layer was identified.",
            }
        ],
    )


def score_sampling_gap_value(local_observation_count: int | None) -> ComponentScore:
    if local_observation_count is None:
        return ComponentScore(
            score=Decimal("35"),
            reasons=[
                {
                    "code": "sampling_gap_unknown",
                    "summary": "Local sampling density is not available yet.",
                }
            ],
        )
    if local_observation_count <= 2:
        return ComponentScore(
            score=Decimal("80"),
            reasons=[
                {
                    "code": "under_sampled_area",
                    "summary": "This area appears under-sampled.",
                }
            ],
        )
    if local_observation_count <= 5:
        return ComponentScore(
            score=Decimal("55"),
            reasons=[
                {
                    "code": "moderate_sampling_gap",
                    "summary": "This area has limited nearby sampling.",
                }
            ],
        )
    return ComponentScore(
        score=Decimal("20"),
        reasons=[
            {
                "code": "well_sampled_area",
                "summary": "This area already has several nearby observations.",
            }
        ],
    )


def score_temporal_cluster(recent_record_count: int | None) -> ComponentScore:
    if recent_record_count is None:
        return ComponentScore(
            score=Decimal("0"),
            reasons=[
                {
                    "code": "temporal_cluster_unknown",
                    "summary": "Recent nearby record timing is not available yet.",
                }
            ],
        )
    if recent_record_count >= 3:
        return ComponentScore(
            score=Decimal("70"),
            reasons=[
                {
                    "code": "temporal_cluster",
                    "summary": "Several similar records were observed recently nearby.",
                }
            ],
        )
    return ComponentScore(
        score=Decimal("15"),
        reasons=[
            {
                "code": "no_temporal_cluster",
                "summary": "No recent nearby cluster is currently apparent.",
            }
        ],
    )


def score_uncertainty_penalty(
    observation: Observation,
    identification: AIIdentification | None,
    context: EnvironmentalContext | None,
) -> ComponentScore:
    penalty = Decimal("0")
    reasons: list[dict[str, str]] = []
    if identification is None:
        penalty += Decimal("35")
        reasons.append(
            {
                "code": "missing_identification_penalty",
                "summary": "Missing identification adds uncertainty.",
            }
        )
    else:
        identity_confidence = (identification.confidence * Decimal("100")).quantize(Decimal("0.01"))
        low_confidence_penalty = max(Decimal("0"), Decimal("100") - identity_confidence) * Decimal(
            "0.25"
        )
        penalty += low_confidence_penalty
        if low_confidence_penalty > Decimal("10"):
            reasons.append(
                {
                    "code": "low_confidence_warning",
                    "summary": "Candidate confidence adds uncertainty.",
                }
            )
        if identification.candidate_species_id is None:
            penalty += Decimal("5")
            reasons.append(
                {
                    "code": "unresolved_species_warning",
                    "summary": "The candidate has not been normalized to a species record.",
                }
            )
    if (
        observation.coordinate_uncertainty_m is not None
        and observation.coordinate_uncertainty_m > Decimal("100")
    ):
        penalty += Decimal("10")
        reasons.append(
            {
                "code": "high_coordinate_uncertainty",
                "summary": "Coordinate uncertainty is high.",
            }
        )
    if context is None:
        penalty += Decimal("5")
        reasons.append(
            {
                "code": "missing_context_penalty",
                "summary": "Missing environmental context adds uncertainty.",
            }
        )
    return ComponentScore(score=penalty.quantize(Decimal("0.01")), reasons=reasons)
