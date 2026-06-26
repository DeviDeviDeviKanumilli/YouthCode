from decimal import Decimal

from app.models.signal_score import SignalScore
from app.schemas.score_explanations import SignalScoreExplanation

PUBLIC_REASON_TEXT = {
    "missing_identification": "a candidate identification is still needed",
    "identity_confidence": "the automated identification has a usable confidence level",
    "low_confidence_warning": "the candidate identification is uncertain",
    "unresolved_species_warning": "the candidate has not been linked to a species record yet",
    "missing_environmental_context": "habitat context has not been added yet",
    "habitat_match_high": "the habitat details fit the possible species context",
    "near_pathway": "the sighting is near a possible spread pathway",
    "nearby_verified_records": "similar verified records exist nearby",
    "under_sampled_area": "the area appears under-sampled",
    "temporal_cluster": "similar records appear to cluster recently nearby",
    "high_coordinate_uncertainty": "the location is imprecise",
}


class ScoreExplanationService:
    def explain(self, score: SignalScore) -> SignalScoreExplanation:
        reason_codes = self._reason_codes(score)
        return SignalScoreExplanation(
            observation_id=score.observation_id,
            label=score.label,
            final_signal_priority=score.final_signal_priority,
            reason_codes=reason_codes,
            public_explanation=self._public_explanation(score, reason_codes),
            researcher_explanation=self._researcher_explanation(score, reason_codes),
        )

    def _reason_codes(self, score: SignalScore) -> list[str]:
        codes: list[str] = []
        for reason in score.reasons:
            code = reason.get("code")
            if isinstance(code, str):
                codes.append(code)
        return codes

    def _public_explanation(self, score: SignalScore, reason_codes: list[str]) -> str:
        if score.label.value == "insufficient_evidence":
            return (
                "There is not enough evidence yet to rank this sighting. "
                "Add or verify an identification and habitat context before treating it "
                "as a signal."
            )
        fragments = [
            PUBLIC_REASON_TEXT[code] for code in reason_codes if code in PUBLIC_REASON_TEXT
        ][:3]
        if not fragments:
            fragments = ["available evidence gives this sighting limited context"]
        return (
            f"This is a {score.label.value.replace('_', ' ')}. "
            f"It is a possible ecological signal because {self._join_fragments(fragments)}. "
            "This is not a confirmed finding until reviewed."
        )

    def _researcher_explanation(self, score: SignalScore, reason_codes: list[str]) -> str:
        components = {
            "identity_confidence": score.identity_confidence,
            "local_novelty": score.local_novelty,
            "habitat_match": score.habitat_match,
            "pathway_risk": score.pathway_risk,
            "nearby_verified_record_context": score.nearby_verified_record_context,
            "ecological_sensitivity": score.ecological_sensitivity,
            "sampling_gap_value": score.sampling_gap_value,
            "temporal_cluster_score": score.temporal_cluster_score,
            "uncertainty_penalty": score.uncertainty_penalty,
        }
        component_text = ", ".join(
            f"{name}={self._format_decimal(value)}" for name, value in components.items()
        )
        return (
            f"Final signal priority {self._format_decimal(score.final_signal_priority)} "
            f"with label {score.label.value}. Components: {component_text}. "
            f"Reason codes: {', '.join(reason_codes) if reason_codes else 'none'}."
        )

    def _join_fragments(self, fragments: list[str]) -> str:
        if len(fragments) == 1:
            return fragments[0]
        if len(fragments) == 2:
            return f"{fragments[0]} and {fragments[1]}"
        return f"{', '.join(fragments[:-1])}, and {fragments[-1]}"

    def _format_decimal(self, value: Decimal) -> str:
        return str(value.quantize(Decimal("0.01")))
