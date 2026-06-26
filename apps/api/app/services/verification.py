import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.user import UserRole
from app.models.verification import Verification, VerificationStatus
from app.repositories.observations import ObservationRepository
from app.repositories.signal_scores import SignalScoreRepository
from app.repositories.species import SpeciesRepository
from app.repositories.users import UserRepository
from app.repositories.verification import VerificationRepository
from app.schemas.verification import VerificationAction, VerificationQueueItem


class VerificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = VerificationRepository(session)
        self.observations = ObservationRepository(session)
        self.users = UserRepository(session)
        self.species = SpeciesRepository(session)
        self.signal_scores = SignalScoreRepository(session)
        self.session = session

    async def get_verification(self, observation_id: uuid.UUID) -> Verification:
        await self._require_observation(observation_id)
        verification = await self.repository.ensure_raw(observation_id)
        await self.session.commit()
        return verification

    async def apply_action(
        self,
        observation_id: uuid.UUID,
        action: VerificationAction,
    ) -> Verification:
        await self._require_observation(observation_id)
        reviewer = await self.users.get(action.reviewer_id)
        if reviewer is None:
            raise AppError(
                code="reviewer_not_found",
                message="Reviewer was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if action.verified_species_id is not None:
            species = await self.species.get(action.verified_species_id)
            if species is None:
                raise AppError(
                    code="species_not_found",
                    message="Verified species was not found.",
                    status_code=status.HTTP_404_NOT_FOUND,
                )
        self._enforce_role(reviewer.role, action.status)
        verification = await self.repository.set_status(
            observation_id,
            status=action.status,
            reviewer_id=action.reviewer_id,
            reviewer_type=reviewer.role.value,
            verified_species_id=action.verified_species_id,
            review_notes=action.review_notes,
        )
        await self.session.commit()
        return verification

    async def verification_queue(self) -> list[VerificationQueueItem]:
        verifications = await self.repository.list_queue()
        items: list[VerificationQueueItem] = []
        for verification in verifications:
            observation = await self.observations.get(verification.observation_id)
            if observation is None:
                continue
            signal_score = await self.signal_scores.get(verification.observation_id)
            items.append(
                VerificationQueueItem(
                    observation_id=verification.observation_id,
                    verification_status=verification.status,
                    signal_label=signal_score.label.value if signal_score else None,
                    final_signal_priority=(
                        str(signal_score.final_signal_priority) if signal_score else None
                    ),
                    submitted_at=observation.created_at,
                )
            )
        return sorted(
            items,
            key=lambda item: (
                self._queue_rank(item.signal_label, item.verification_status),
                item.submitted_at,
            ),
        )

    async def _require_observation(self, observation_id: uuid.UUID) -> None:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

    def _enforce_role(self, role: UserRole, requested_status: VerificationStatus) -> None:
        if requested_status in {
            VerificationStatus.expert_verified,
            VerificationStatus.field_confirmed,
        } and role not in {UserRole.reviewer, UserRole.admin}:
            raise AppError(
                code="verification_forbidden",
                message="Only reviewers or admins can apply expert verification statuses.",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        if role == UserRole.consumer:
            raise AppError(
                code="verification_forbidden",
                message="Consumers cannot review observations.",
                status_code=status.HTTP_403_FORBIDDEN,
            )

    def _queue_rank(self, signal_label: str | None, verification_status: VerificationStatus) -> int:
        if signal_label == "priority_ecological_signal":
            return 0
        if signal_label == "high_value_verification_candidate":
            return 1
        if verification_status == VerificationStatus.needs_more_evidence:
            return 2
        return 3
