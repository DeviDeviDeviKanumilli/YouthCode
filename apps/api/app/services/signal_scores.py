import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.identification import AIIdentification
from app.models.observation import Observation
from app.models.signal_score import SignalScore, SignalScoreLabel
from app.repositories.environmental_context import EnvironmentalContextRepository
from app.repositories.identifications import IdentificationRepository
from app.repositories.observations import ObservationRepository
from app.repositories.signal_scores import SignalScoreRepository
from app.schemas.signal_scores import SignalScoreCreate

MODEL_VERSION = "m2.7-rules-0.1.0"


def label_for_score(score: Decimal, insufficient_evidence: bool = False) -> SignalScoreLabel:
    if insufficient_evidence:
        return SignalScoreLabel.insufficient_evidence
    if score <= Decimal("25"):
        return SignalScoreLabel.low_signal
    if score <= Decimal("50"):
        return SignalScoreLabel.moderate_signal
    if score <= Decimal("75"):
        return SignalScoreLabel.high_value_verification_candidate
    return SignalScoreLabel.priority_ecological_signal


class SignalScoreService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = SignalScoreRepository(session)
        self.observations = ObservationRepository(session)
        self.identifications = IdentificationRepository(session)
        self.environmental_context = EnvironmentalContextRepository(session)
        self.session = session

    async def get_score(self, observation_id: uuid.UUID) -> SignalScore:
        score = await self.repository.get(observation_id)
        if score is None:
            raise AppError(
                code="signal_score_not_found",
                message="Signal score was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return score

    async def recompute_score(self, observation_id: uuid.UUID) -> SignalScore:
        observation = await self._require_observation(observation_id)
        identifications = await self.identifications.list_for_observation(observation_id)
        latest_identification = identifications[0] if identifications else None
        context = await self.environmental_context.get(observation_id)
        score_data = self._compute_score(observation, latest_identification, context is not None)
        score = await self.repository.upsert(observation_id, score_data)
        await self.session.commit()
        return score

    async def _require_observation(self, observation_id: uuid.UUID) -> Observation:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return observation

    def _compute_score(
        self,
        observation: Observation,
        identification: AIIdentification | None,
        has_environmental_context: bool,
    ) -> SignalScoreCreate:
        reasons: list[dict[str, str]] = []
        insufficient_evidence = identification is None

        if identification is None:
            identity_confidence = Decimal("0")
            uncertainty_penalty = Decimal("35")
            reasons.append(
                {
                    "code": "missing_identification",
                    "summary": "No AI-assisted candidate identification is available yet.",
                }
            )
        else:
            identity_confidence = (identification.confidence * Decimal("100")).quantize(
                Decimal("0.01")
            )
            uncertainty_penalty = (
                max(Decimal("0"), Decimal("100") - identity_confidence) * Decimal("0.25")
            )
            reasons.append(
                {
                    "code": "identity_confidence",
                    "summary": f"Candidate confidence is {identification.confidence_label}.",
                }
            )

        habitat_match = Decimal("60") if has_environmental_context else Decimal("25")
        if has_environmental_context:
            reasons.append(
                {
                    "code": "environmental_context_available",
                    "summary": "Environmental context is available for scoring.",
                }
            )
        else:
            reasons.append(
                {
                    "code": "missing_environmental_context",
                    "summary": "Environmental context is not available yet.",
                }
            )

        local_novelty = Decimal("40")
        pathway_risk = Decimal("45") if observation.region_code else Decimal("25")
        nearby_verified_record_context = Decimal("0")
        ecological_sensitivity = Decimal("30")
        sampling_gap_value = Decimal("35")
        temporal_cluster_score = Decimal("0")

        weighted_score = (
            identity_confidence * Decimal("0.20")
            + local_novelty * Decimal("0.15")
            + habitat_match * Decimal("0.15")
            + pathway_risk * Decimal("0.15")
            + nearby_verified_record_context * Decimal("0.10")
            + ecological_sensitivity * Decimal("0.10")
            + sampling_gap_value * Decimal("0.10")
            + temporal_cluster_score * Decimal("0.05")
            - uncertainty_penalty
        )
        final_score = min(Decimal("100"), max(Decimal("0"), weighted_score)).quantize(
            Decimal("0.01")
        )

        return SignalScoreCreate(
            identity_confidence=identity_confidence,
            local_novelty=local_novelty,
            habitat_match=habitat_match,
            pathway_risk=pathway_risk,
            nearby_verified_record_context=nearby_verified_record_context,
            ecological_sensitivity=ecological_sensitivity,
            sampling_gap_value=sampling_gap_value,
            temporal_cluster_score=temporal_cluster_score,
            uncertainty_penalty=uncertainty_penalty.quantize(Decimal("0.01")),
            final_signal_priority=final_score,
            label=label_for_score(final_score, insufficient_evidence),
            reasons=reasons,
            model_version=MODEL_VERSION,
        )
