import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.api.deps import get_current_user_optional
from app.core.errors import AppError
from app.db.session import get_async_session
from app.models.sampling_grid import SamplingLabel
from app.models.signal_score import SignalScoreLabel
from app.models.user import User
from app.models.verification import VerificationStatus
from app.schemas.research_observations import ResearchObservationPage
from app.services.research_observations import ResearchObservationSearchService, ResearchSort

router = APIRouter(prefix="/research", tags=["research"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get("/observations", response_model=ResearchObservationPage)
async def search_research_observations(
    session: SessionDep,
    current_user: Annotated[User | None, Depends(get_current_user_optional)],
    requester_id: uuid.UUID | None = None,
    species_id: uuid.UUID | None = None,
    candidate_name: Annotated[str | None, Query(max_length=255)] = None,
    verification_status: VerificationStatus | None = None,
    signal_label: SignalScoreLabel | None = None,
    min_signal_score: Annotated[Decimal | None, Query(ge=Decimal("0"), le=Decimal("100"))] = None,
    max_signal_score: Annotated[Decimal | None, Query(ge=Decimal("0"), le=Decimal("100"))] = None,
    bbox: Annotated[str | None, Query(max_length=120)] = None,
    region_code: Annotated[str | None, Query(max_length=32)] = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    has_media: bool | None = None,
    needs_review: bool | None = None,
    sampling_label: SamplingLabel | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    sort: ResearchSort = "submitted_at_desc",
) -> ResearchObservationPage:
    resolved_requester_id = current_user.id if current_user else requester_id
    if resolved_requester_id is None:
        raise AppError(
            code="auth_required",
            message="Provide a bearer token or requester_id.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    return await ResearchObservationSearchService(session).search(
        requester_id=resolved_requester_id,
        species_id=species_id,
        candidate_name=candidate_name,
        verification_status=verification_status,
        signal_label=signal_label,
        min_signal_score=min_signal_score,
        max_signal_score=max_signal_score,
        bbox=bbox,
        region_code=region_code,
        from_date=from_date,
        to_date=to_date,
        has_media=has_media,
        needs_review=needs_review,
        sampling_label=sampling_label,
        limit=limit,
        offset=offset,
        sort=sort,
    )
