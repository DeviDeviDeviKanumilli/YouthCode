import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.identification import AIIdentification
from app.models.observation import Observation
from app.models.user import UserRole
from app.models.verification import Verification, VerificationStatus
from app.repositories.environmental_context import EnvironmentalContextRepository
from app.repositories.identifications import IdentificationRepository
from app.repositories.media import MediaRepository
from app.repositories.observations import ObservationRepository
from app.repositories.signal_scores import SignalScoreRepository
from app.repositories.species import SpeciesRepository
from app.repositories.users import UserRepository
from app.repositories.verification import VerificationRepository
from app.schemas.verification import VerificationAction, VerificationQueueItem
from app.services.nearby_records import NearbyRecordsService


class VerificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = VerificationRepository(session)
        self.environmental_context = EnvironmentalContextRepository(session)
        self.identifications = IdentificationRepository(session)
        self.media = MediaRepository(session)
        self.nearby_records = NearbyRecordsService(session)
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

    async def verification_queue(
        self,
        requester_id: uuid.UUID,
        *,
        include_resolved: bool = False,
    ) -> list[VerificationQueueItem]:
        await self._require_research_access(requester_id)
        verifications = await self.repository.list_queue(include_resolved=include_resolved)
        items: list[VerificationQueueItem] = []
        for verification in verifications:
            observation = await self.observations.get(verification.observation_id)
            if observation is None:
                continue
            identification = await self._latest_identification(verification.observation_id)
            signal_score = await self.signal_scores.get(verification.observation_id)
            media = await self.media.list_for_observation(verification.observation_id)
            context = await self.environmental_context.get(verification.observation_id)
            items.append(
                VerificationQueueItem(
                    observation_id=verification.observation_id,
                    verification_status=verification.status,
                    observation=self._observation_payload(observation),
                    media=[
                        {
                            "media_id": str(item.id),
                            "file_type": item.file_type.value,
                            "public_url": item.public_url,
                            "storage_key": item.storage_key,
                            "quality_score": (
                                str(item.quality_score) if item.quality_score is not None else None
                            ),
                        }
                        for item in media
                    ],
                    latest_identification=(
                        self._identification_payload(identification) if identification else None
                    ),
                    environmental_context=(
                        {
                            "land_cover_class": context.land_cover_class,
                            "tree_canopy_pct": (
                                str(context.tree_canopy_pct)
                                if context.tree_canopy_pct is not None
                                else None
                            ),
                            "impervious_surface_pct": (
                                str(context.impervious_surface_pct)
                                if context.impervious_surface_pct is not None
                                else None
                            ),
                            "distance_to_water_m": (
                                str(context.distance_to_water_m)
                                if context.distance_to_water_m is not None
                                else None
                            ),
                            "distance_to_road_m": (
                                str(context.distance_to_road_m)
                                if context.distance_to_road_m is not None
                                else None
                            ),
                            "enrichment_version": context.enrichment_version,
                        }
                        if context
                        else None
                    ),
                    signal_score=(
                        {
                            "label": signal_score.label.value,
                            "final_signal_priority": str(signal_score.final_signal_priority),
                            "model_version": signal_score.model_version,
                        }
                        if signal_score
                        else None
                    ),
                    nearby_records=await self._nearby_records_payload(
                        verification.observation_id,
                        identification,
                    ),
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
                -item.submitted_at.timestamp(),
            ),
        )

    async def _latest_identification(
        self,
        observation_id: uuid.UUID,
    ) -> AIIdentification | None:
        identifications = await self.identifications.list_for_observation(observation_id)
        return identifications[0] if identifications else None

    async def _nearby_records_payload(
        self,
        observation_id: uuid.UUID,
        identification: AIIdentification | None,
    ) -> dict[str, Any]:
        summary = await self.nearby_records.summarize_for_observation(
            observation_id,
            species_id=identification.candidate_species_id if identification else None,
            radius_km=Decimal("2"),
        )
        return summary.model_dump(mode="json")

    def _observation_payload(self, observation: Observation) -> dict[str, Any]:
        return {
            "id": str(observation.id),
            "timestamp": observation.timestamp.isoformat(),
            "latitude": str(observation.latitude),
            "longitude": str(observation.longitude),
            "region_code": observation.region_code,
            "privacy_level": observation.privacy_level.value,
            "source": observation.source.value,
        }

    def _identification_payload(self, identification: AIIdentification) -> dict[str, Any]:
        return {
            "identification_id": str(identification.id),
            "candidate_species_id": (
                str(identification.candidate_species_id)
                if identification.candidate_species_id
                else None
            ),
            "candidate_scientific_name": identification.candidate_scientific_name,
            "candidate_common_name": identification.candidate_common_name,
            "confidence": str(identification.confidence),
            "confidence_label": identification.confidence_label.value,
            "needs_verification": identification.needs_verification,
        }

    async def _require_observation(self, observation_id: uuid.UUID) -> None:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

    async def _require_research_access(self, requester_id: uuid.UUID) -> None:
        requester = await self.users.get(requester_id)
        if requester is None:
            raise AppError(
                code="requester_not_found",
                message="Requester was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if requester.role not in {UserRole.researcher, UserRole.reviewer, UserRole.admin}:
            raise AppError(
                code="verification_queue_forbidden",
                message="Only research, reviewer, or admin users can open the verification queue.",
                status_code=status.HTTP_403_FORBIDDEN,
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
