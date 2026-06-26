import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.identification import AIIdentification, ConfidenceLabel
from app.repositories.identifications import IdentificationRepository
from app.repositories.media import MediaRepository
from app.repositories.observations import ObservationRepository
from app.repositories.species import SpeciesRepository
from app.repositories.verification import VerificationRepository
from app.schemas.identifications import AIIdentificationCreate, AIIdentificationRunCreate
from app.services.identification_providers import (
    IdentificationProviderUnavailableError,
    get_identification_provider,
)
from app.services.taxonomy import TaxonomyNormalizationService


def confidence_label_for(confidence: Decimal) -> ConfidenceLabel:
    if confidence < Decimal("0.35"):
        return ConfidenceLabel.low
    if confidence < Decimal("0.65"):
        return ConfidenceLabel.medium
    if confidence < Decimal("0.85"):
        return ConfidenceLabel.medium_high
    return ConfidenceLabel.high


class IdentificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = IdentificationRepository(session)
        self.media = MediaRepository(session)
        self.observations = ObservationRepository(session)
        self.species = SpeciesRepository(session)
        self.taxonomy = TaxonomyNormalizationService(session)
        self.verification = VerificationRepository(session)
        self.session = session

    async def create_identification(
        self,
        observation_id: uuid.UUID,
        data: AIIdentificationCreate,
    ) -> AIIdentification:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if data.candidate_species_id is not None:
            species = await self.species.get(data.candidate_species_id)
            if species is None:
                raise AppError(
                    code="species_not_found",
                    message="Candidate species was not found.",
                    status_code=status.HTTP_404_NOT_FOUND,
                )
        if data.confidence_label is None:
            data = data.model_copy(
                update={"confidence_label": confidence_label_for(data.confidence)}
            )
        data = await self._normalize_species_candidate(data)

        identification = await self.repository.create(observation_id, data)
        await self.session.commit()
        return identification

    async def identify_from_media(
        self,
        observation_id: uuid.UUID,
        data: AIIdentificationRunCreate,
    ) -> AIIdentification:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        media = await self.media.get(data.media_id)
        if media is None:
            raise AppError(
                code="media_not_found",
                message="Media was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if media.observation_id != observation_id:
            raise AppError(
                code="media_observation_mismatch",
                message="Media does not belong to this observation.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        try:
            provider = get_identification_provider(data.provider_name)
            result = await provider.identify_from_media(observation_id, data.media_id)
        except IdentificationProviderUnavailableError as exc:
            raise AppError(
                code="identification_provider_unavailable",
                message=str(exc),
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            ) from exc
        identification = await self.create_identification(
            observation_id,
            result.to_identification_create(),
        )
        await self.verification.mark_ai_suggested(observation_id)
        await self.session.commit()
        return identification

    async def list_observation_identifications(
        self,
        observation_id: uuid.UUID,
    ) -> list[AIIdentification]:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return await self.repository.list_for_observation(observation_id)

    async def get_identification(self, identification_id: uuid.UUID) -> AIIdentification:
        identification = await self.repository.get(identification_id)
        if identification is None:
            raise AppError(
                code="identification_not_found",
                message="Identification was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return identification

    async def _normalize_species_candidate(
        self,
        data: AIIdentificationCreate,
    ) -> AIIdentificationCreate:
        if data.candidate_species_id is not None:
            return data

        result = await self.taxonomy.normalize_candidate(
            candidate_scientific_name=data.candidate_scientific_name,
            candidate_common_name=data.candidate_common_name,
        )
        raw_model_output = {
            **data.raw_model_output,
            "taxonomy_normalization": result.model_dump(mode="json"),
        }
        if result.species_id is None:
            return data.model_copy(update={"raw_model_output": raw_model_output})
        return data.model_copy(
            update={
                "candidate_species_id": result.species_id,
                "raw_model_output": raw_model_output,
            }
        )
