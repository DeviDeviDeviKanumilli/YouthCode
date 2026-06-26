import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.repositories.identifications import IdentificationRepository
from app.repositories.media import MediaRepository
from app.repositories.observations import ObservationRepository
from app.repositories.signal_scores import SignalScoreRepository
from app.repositories.users import UserRepository
from app.repositories.verification import VerificationRepository
from app.schemas.user_sightings import UserObservationListItem


class UserSightingsService:
    def __init__(self, session: AsyncSession) -> None:
        self.users = UserRepository(session)
        self.observations = ObservationRepository(session)
        self.media = MediaRepository(session)
        self.identifications = IdentificationRepository(session)
        self.signal_scores = SignalScoreRepository(session)
        self.verification = VerificationRepository(session)

    async def list_user_sightings(
        self,
        user_id: uuid.UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> list[UserObservationListItem]:
        user = await self.users.get(user_id)
        if user is None:
            raise AppError(
                code="user_not_found",
                message="User was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        observations = await self.observations.list(user_id=user_id, limit=limit, offset=offset)
        items: list[UserObservationListItem] = []
        for observation in observations:
            media = await self.media.list_for_observation(observation.id)
            identifications = await self.identifications.list_for_observation(observation.id)
            signal_score = await self.signal_scores.get(observation.id)
            verification = await self.verification.get(observation.id)
            latest_identification = identifications[0] if identifications else None
            first_media = media[0] if media else None
            possible_species = None
            if latest_identification is not None:
                possible_species = (
                    latest_identification.candidate_common_name
                    or latest_identification.candidate_scientific_name
                )
            items.append(
                UserObservationListItem(
                    observation_id=observation.id,
                    thumbnail_url=first_media.public_url if first_media else None,
                    possible_species=possible_species,
                    signal_label=signal_score.label.value if signal_score else None,
                    verification_status=verification.status.value if verification else "raw",
                    created_at=observation.created_at,
                )
            )
        return items
