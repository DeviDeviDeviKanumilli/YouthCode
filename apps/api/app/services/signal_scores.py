import uuid
from datetime import timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.environmental_context import EnvironmentalContext
from app.models.identification import AIIdentification
from app.models.observation import Observation
from app.models.signal_score import SignalScore, SignalScoreLabel
from app.repositories.environmental_context import EnvironmentalContextRepository
from app.repositories.identifications import IdentificationRepository
from app.repositories.observations import ObservationRepository
from app.repositories.signal_scores import SignalScoreRepository
from app.schemas.signal_scores import SignalScoreCreate
from app.schemas.static_geo_layers import NearbyKnownRecord
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
from app.services.nearby_records import VERIFIED_RECORD_STATUSES
from app.services.scoring_model import (
    MODEL_VERSION,
    calculate_signal_priority,
)
from app.services.scoring_model import (
    label_for_score as scoring_model_label_for_score,
)
from app.services.static_geo_layers import StaticGeoLayerService


def label_for_score(score: Decimal, insufficient_evidence: bool = False) -> SignalScoreLabel:
    return scoring_model_label_for_score(score, insufficient_evidence)


class SignalScoreService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = SignalScoreRepository(session)
        self.observations = ObservationRepository(session)
        self.identifications = IdentificationRepository(session)
        self.environmental_context = EnvironmentalContextRepository(session)
        self.static_layers = StaticGeoLayerService(session)
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
        nearby_records = await self._nearby_records_for_identification(
            observation,
            latest_identification,
        )
        local_observation_count = await self._local_observation_count(observation)
        recent_record_count = self._recent_record_count(observation, nearby_records)
        verified_record_count = sum(
            1 for record in nearby_records if record.verification_status in VERIFIED_RECORD_STATUSES
        )
        score_data = self._compute_score(
            observation,
            latest_identification,
            context,
            nearby_record_count=len(nearby_records) if latest_identification else None,
            verified_record_count=verified_record_count if latest_identification else None,
            local_observation_count=local_observation_count,
            recent_record_count=recent_record_count if latest_identification else None,
        )
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
        context: EnvironmentalContext | None,
        nearby_record_count: int | None = None,
        verified_record_count: int | None = None,
        local_observation_count: int | None = None,
        recent_record_count: int | None = None,
    ) -> SignalScoreCreate:
        insufficient_evidence = identification is None
        identity = score_identity_confidence(identification)
        local_novelty = score_local_novelty(nearby_record_count)
        habitat_match = score_habitat_match(observation, context)
        pathway_risk = score_pathway_risk(context)
        nearby_verified_record_context = score_nearby_verified_record_context(
            verified_record_count
        )
        ecological_sensitivity = score_ecological_sensitivity(context)
        sampling_gap_value = score_sampling_gap_value(local_observation_count)
        temporal_cluster = score_temporal_cluster(recent_record_count)
        uncertainty_penalty = score_uncertainty_penalty(observation, identification, context)
        reasons = [
            *identity.reasons,
            *local_novelty.reasons,
            *habitat_match.reasons,
            *pathway_risk.reasons,
            *nearby_verified_record_context.reasons,
            *ecological_sensitivity.reasons,
            *sampling_gap_value.reasons,
            *temporal_cluster.reasons,
            *uncertainty_penalty.reasons,
        ]

        scoring_result = calculate_signal_priority(
            {
                "identity_confidence": identity.score,
                "local_novelty": local_novelty.score,
                "habitat_match": habitat_match.score,
                "pathway_risk": pathway_risk.score,
                "nearby_verified_record_context": nearby_verified_record_context.score,
                "ecological_sensitivity": ecological_sensitivity.score,
                "sampling_gap_value": sampling_gap_value.score,
                "temporal_cluster_score": temporal_cluster.score,
            },
            uncertainty_penalty=uncertainty_penalty.score,
            insufficient_evidence=insufficient_evidence,
        )

        return SignalScoreCreate(
            identity_confidence=identity.score,
            local_novelty=local_novelty.score,
            habitat_match=habitat_match.score,
            pathway_risk=pathway_risk.score,
            nearby_verified_record_context=nearby_verified_record_context.score,
            ecological_sensitivity=ecological_sensitivity.score,
            sampling_gap_value=sampling_gap_value.score,
            temporal_cluster_score=temporal_cluster.score,
            uncertainty_penalty=uncertainty_penalty.score,
            final_signal_priority=scoring_result.final_signal_priority,
            label=scoring_result.label,
            reasons=reasons,
            model_version=MODEL_VERSION,
        )

    async def _nearby_records_for_identification(
        self,
        observation: Observation,
        identification: AIIdentification | None,
    ) -> list[NearbyKnownRecord]:
        if identification is None or identification.candidate_species_id is None:
            return []
        return await self.static_layers.nearby_known_records(
            observation.latitude,
            observation.longitude,
            radius_m=Decimal("5000"),
            species_id=identification.candidate_species_id,
        )

    async def _local_observation_count(self, observation: Observation) -> int:
        degree_delta = Decimal("5") / Decimal("111")
        observations = await self.observations.list(
            bbox=(
                observation.longitude - degree_delta,
                observation.latitude - degree_delta,
                observation.longitude + degree_delta,
                observation.latitude + degree_delta,
            ),
            limit=250,
        )
        return max(0, len(observations) - 1)

    def _recent_record_count(
        self,
        observation: Observation,
        nearby_records: list[NearbyKnownRecord],
    ) -> int:
        recent_cutoff = observation.timestamp - timedelta(days=30)
        return sum(1 for record in nearby_records if record.observed_at >= recent_cutoff)
