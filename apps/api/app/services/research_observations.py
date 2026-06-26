import uuid
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.identification import AIIdentification
from app.models.media import MediaFileType
from app.models.observation import Observation
from app.models.sampling_grid import SamplingLabel
from app.models.signal_score import SignalScore, SignalScoreLabel
from app.models.user import UserRole
from app.models.verification import VerificationStatus
from app.repositories.identifications import IdentificationRepository
from app.repositories.media import MediaRepository
from app.repositories.observations import ObservationRepository
from app.repositories.sampling_grid import SamplingGridRepository
from app.repositories.signal_scores import SignalScoreRepository
from app.repositories.users import UserRepository
from app.repositories.verification import VerificationRepository
from app.schemas.research_observations import (
    ResearchObservationListItem,
    ResearchObservationLocation,
    ResearchObservationPage,
)

RESEARCH_SEARCH_CANDIDATE_LIMIT = 1000
ResearchSort = Literal[
    "submitted_at_desc",
    "submitted_at_asc",
    "signal_score_desc",
    "signal_score_asc",
]


class ResearchObservationSearchService:
    def __init__(self, session: AsyncSession) -> None:
        self.observations = ObservationRepository(session)
        self.identifications = IdentificationRepository(session)
        self.media = MediaRepository(session)
        self.signal_scores = SignalScoreRepository(session)
        self.users = UserRepository(session)
        self.verification = VerificationRepository(session)
        self.sampling_grid = SamplingGridRepository(session)

    async def search(
        self,
        *,
        requester_id: uuid.UUID,
        species_id: uuid.UUID | None,
        candidate_name: str | None,
        verification_status: VerificationStatus | None,
        signal_label: SignalScoreLabel | None,
        min_signal_score: Decimal | None,
        max_signal_score: Decimal | None,
        bbox: str | None,
        region_code: str | None,
        from_date: datetime | None,
        to_date: datetime | None,
        has_media: bool | None,
        needs_review: bool | None,
        sampling_label: SamplingLabel | None,
        limit: int,
        offset: int,
        sort: ResearchSort,
    ) -> ResearchObservationPage:
        await self._require_research_access(requester_id)
        if from_date is not None and to_date is not None and from_date > to_date:
            raise AppError(
                code="invalid_date_range",
                message="from_date must be before or equal to to_date.",
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
        rows: list[ResearchObservationListItem] = []
        observations = await self.observations.list(
            bbox=self._parse_bbox(bbox) if bbox else None,
            region_code=region_code,
            from_date=from_date,
            to_date=to_date,
            limit=RESEARCH_SEARCH_CANDIDATE_LIMIT,
            offset=0,
        )
        for observation in observations:
            row = await self._row_for_observation(observation)
            identification = await self._latest_identification(observation.id)
            score = await self.signal_scores.get(observation.id)
            if not self._matches_filters(
                row=row,
                identification=identification,
                score=score,
                species_id=species_id,
                candidate_name=candidate_name,
                verification_status=verification_status,
                signal_label=signal_label,
                min_signal_score=min_signal_score,
                max_signal_score=max_signal_score,
                has_media=has_media,
                needs_review=needs_review,
                sampling_label=sampling_label,
            ):
                continue
            rows.append(row)
        rows = self._sort_rows(rows, sort)
        total = len(rows)
        return ResearchObservationPage(
            items=rows[offset : offset + limit],
            total=total,
            limit=limit,
            offset=offset,
            sort=sort,
        )

    async def _row_for_observation(self, observation: Observation) -> ResearchObservationListItem:
        identification = await self._latest_identification(observation.id)
        media_items = await self.media.list_for_observation(observation.id)
        image = next((item for item in media_items if item.file_type == MediaFileType.image), None)
        score = await self.signal_scores.get(observation.id)
        verification = await self.verification.ensure_raw(observation.id)
        sampling_cell = await self.sampling_grid.find_cell_for_point(
            latitude=observation.latitude,
            longitude=observation.longitude,
            region_code=observation.region_code,
        )
        return ResearchObservationListItem(
            observation_id=observation.id,
            photo_thumbnail_url=image.public_url if image else None,
            candidate_species=self._candidate_species(identification),
            confidence=str(identification.confidence) if identification else None,
            signal_score=str(score.final_signal_priority) if score else None,
            signal_label=score.label if score else None,
            verification_status=verification.status,
            location_summary=ResearchObservationLocation(
                latitude=str(observation.latitude),
                longitude=str(observation.longitude),
                region_code=observation.region_code,
                privacy_level=observation.privacy_level.value,
            ),
            submitted_at=observation.created_at,
            sampling_label=sampling_cell.sampling_label if sampling_cell else None,
            needs_review=self._needs_review(verification.status, identification),
        )

    async def _latest_identification(
        self,
        observation_id: uuid.UUID,
    ) -> AIIdentification | None:
        identifications = await self.identifications.list_for_observation(observation_id)
        return identifications[0] if identifications else None

    def _matches_filters(
        self,
        *,
        row: ResearchObservationListItem,
        identification: AIIdentification | None,
        score: SignalScore | None,
        species_id: uuid.UUID | None,
        candidate_name: str | None,
        verification_status: VerificationStatus | None,
        signal_label: SignalScoreLabel | None,
        min_signal_score: Decimal | None,
        max_signal_score: Decimal | None,
        has_media: bool | None,
        needs_review: bool | None,
        sampling_label: SamplingLabel | None,
    ) -> bool:
        if species_id is not None and (
            identification is None or identification.candidate_species_id != species_id
        ):
            return False
        if candidate_name is not None and (
            row.candidate_species is None
            or candidate_name.lower() not in row.candidate_species.lower()
        ):
            return False
        if verification_status is not None and row.verification_status != verification_status:
            return False
        if signal_label is not None and row.signal_label != signal_label:
            return False
        if min_signal_score is not None and (
            score is None or score.final_signal_priority < min_signal_score
        ):
            return False
        if max_signal_score is not None and (
            score is None or score.final_signal_priority > max_signal_score
        ):
            return False
        if has_media is not None and (row.photo_thumbnail_url is not None) != has_media:
            return False
        if needs_review is not None and row.needs_review != needs_review:
            return False
        return not (sampling_label is not None and row.sampling_label != sampling_label)

    def _sort_rows(
        self,
        rows: list[ResearchObservationListItem],
        sort: ResearchSort,
    ) -> list[ResearchObservationListItem]:
        if sort == "submitted_at_asc":
            return sorted(rows, key=lambda row: row.submitted_at)
        if sort == "signal_score_desc":
            return sorted(rows, key=self._score_sort_value, reverse=True)
        if sort == "signal_score_asc":
            return sorted(rows, key=self._score_sort_value)
        return sorted(rows, key=lambda row: row.submitted_at, reverse=True)

    def _score_sort_value(self, row: ResearchObservationListItem) -> Decimal:
        return Decimal(row.signal_score) if row.signal_score is not None else Decimal("-1")

    def _candidate_species(self, identification: AIIdentification | None) -> str | None:
        if identification is None:
            return None
        return identification.candidate_common_name or identification.candidate_scientific_name

    def _needs_review(
        self,
        verification_status: VerificationStatus,
        identification: AIIdentification | None,
    ) -> bool:
        if verification_status in {
            VerificationStatus.raw,
            VerificationStatus.ai_suggested,
            VerificationStatus.community_supported,
            VerificationStatus.needs_more_evidence,
        }:
            return True
        return bool(identification and identification.needs_verification)

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
                code="research_observations_forbidden",
                message="Only research, reviewer, or admin users can search observations.",
                status_code=status.HTTP_403_FORBIDDEN,
            )

    def _parse_bbox(self, bbox: str) -> tuple[Decimal, Decimal, Decimal, Decimal]:
        try:
            parts = [Decimal(part.strip()) for part in bbox.split(",")]
        except (InvalidOperation, ValueError) as exc:
            raise AppError(
                code="invalid_bbox",
                message="bbox must contain min_lon,min_lat,max_lon,max_lat.",
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            ) from exc
        if len(parts) != 4:
            raise AppError(
                code="invalid_bbox",
                message="bbox must contain min_lon,min_lat,max_lon,max_lat.",
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
        min_lon, min_lat, max_lon, max_lat = parts
        if min_lon >= max_lon or min_lat >= max_lat:
            raise AppError(
                code="invalid_bbox",
                message="bbox minimums must be less than maximums.",
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
        return min_lon, min_lat, max_lon, max_lat
