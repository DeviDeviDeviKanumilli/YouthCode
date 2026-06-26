import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.identification import AIIdentification
from app.models.verification import VerificationStatus
from app.repositories.environmental_context import EnvironmentalContextRepository
from app.repositories.identifications import IdentificationRepository
from app.repositories.observations import ObservationRepository
from app.repositories.signal_scores import SignalScoreRepository
from app.repositories.verification import VerificationRepository
from app.schemas.intelligence_cards import PossibleSpecies, SightingIntelligenceCard


class IntelligenceCardService:
    def __init__(self, session: AsyncSession) -> None:
        self.observations = ObservationRepository(session)
        self.identifications = IdentificationRepository(session)
        self.environmental_context = EnvironmentalContextRepository(session)
        self.signal_scores = SignalScoreRepository(session)
        self.verification = VerificationRepository(session)

    async def get_card(self, observation_id: uuid.UUID) -> SightingIntelligenceCard:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        identifications = await self.identifications.list_for_observation(observation_id)
        identification = identifications[0] if identifications else None
        context = await self.environmental_context.get(observation_id)
        signal_score = await self.signal_scores.get(observation_id)
        verification = await self.verification.get(observation_id)
        verification_status = verification.status if verification else VerificationStatus.raw

        data_sources = ["observation"]
        if identification:
            data_sources.append(f"identification:{identification.model_name}:{identification.model_version}")
        if context:
            data_sources.append(f"environmental_context:{context.enrichment_version}")
            data_sources.extend(sorted(context.data_sources.keys()))
        if signal_score:
            data_sources.append(f"signal_score:{signal_score.model_version}")
        if verification:
            data_sources.append("verification")

        return SightingIntelligenceCard(
            observation_id=observation.id,
            possible_species=self._possible_species(identification),
            confidence=identification.confidence if identification else None,
            confidence_label=identification.confidence_label.value if identification else None,
            similar_species_warning=self._similar_species_warning(identification),
            local_status=self._local_status(verification_status),
            known_nearby_records_summary="Nearby verified record context is not available yet.",
            habitat_match_summary=self._habitat_summary(context is not None),
            pathway_summary=self._pathway_summary(context is not None),
            sampling_value_summary=self._sampling_summary(
                signal_score.final_signal_priority if signal_score else None
            ),
            verification_status=verification_status.value,
            signal_priority=signal_score.final_signal_priority if signal_score else None,
            signal_label=signal_score.label.value if signal_score else None,
            plain_language_explanation=self._plain_language_explanation(
                identification=identification,
                has_context=context is not None,
                verification_status=verification_status,
            ),
            uncertainty_notice=self._uncertainty_notice(verification_status),
            data_sources_used=data_sources,
        )

    def _possible_species(self, identification: AIIdentification | None) -> PossibleSpecies | None:
        if identification is None:
            return None
        return PossibleSpecies(
            scientific_name=identification.candidate_scientific_name,
            common_name=identification.candidate_common_name,
        )

    def _similar_species_warning(self, identification: AIIdentification | None) -> str | None:
        if identification is None:
            return None
        if identification.similar_species:
            return "Similar species may exist; this candidate needs review."
        return "Similar species have not been ruled out."

    def _local_status(self, verification_status: VerificationStatus) -> str:
        if verification_status in {
            VerificationStatus.expert_verified,
            VerificationStatus.field_confirmed,
        }:
            return "Verified ecological record"
        return "Possible invasive concern"

    def _habitat_summary(self, has_context: bool) -> str:
        if has_context:
            return "Habitat context is available and should be reviewed with the species candidate."
        return "Habitat match is unknown because environmental context is not available yet."

    def _pathway_summary(self, has_context: bool) -> str:
        if has_context:
            return "Potential pathway context is available; this is not a confirmed spread route."
        return "Pathway context is unknown until environmental enrichment runs."

    def _sampling_summary(self, signal_priority: Decimal | None) -> str:
        if signal_priority is None:
            return "Sampling value has not been scored yet."
        if signal_priority >= Decimal("51"):
            return "This may be a high-value verification candidate."
        return "This is currently a lower-priority ecological signal."

    def _plain_language_explanation(
        self,
        *,
        identification: AIIdentification | None,
        has_context: bool,
        verification_status: VerificationStatus,
    ) -> str:
        if verification_status in {
            VerificationStatus.expert_verified,
            VerificationStatus.field_confirmed,
        }:
            return (
                "This record has been reviewed and can be used with its verification status. "
                "Environmental and signal context should still be interpreted with source metadata."
            )
        if identification is None:
            return (
                "This sighting has been stored, but there is not enough evidence yet to suggest a "
                "possible species or ecological signal."
            )
        context_clause = (
            "Environmental context is available for review."
            if has_context
            else "Environmental context has not been computed yet."
        )
        species_name = (
            identification.candidate_common_name or identification.candidate_scientific_name
        )
        return (
            f"This may be {species_name}. "
            f"{context_clause} This is an AI-assisted suggestion, not a confirmed identification."
        )

    def _uncertainty_notice(self, verification_status: VerificationStatus) -> str:
        if verification_status in {
            VerificationStatus.expert_verified,
            VerificationStatus.field_confirmed,
        }:
            return (
                "This record has verification support, but model-derived context may still be "
                "uncertain."
            )
        return "This is an AI-assisted suggestion, not a confirmed identification."
