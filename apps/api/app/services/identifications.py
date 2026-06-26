import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.identification import AIIdentification, ConfidenceLabel
from app.repositories.identifications import IdentificationRepository
from app.repositories.observations import ObservationRepository
from app.repositories.species import SpeciesRepository
from app.schemas.identifications import AIIdentificationCreate


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
        self.observations = ObservationRepository(session)
        self.species = SpeciesRepository(session)
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

        identification = await self.repository.create(observation_id, data)
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
