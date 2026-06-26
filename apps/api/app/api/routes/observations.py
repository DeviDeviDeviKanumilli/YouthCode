import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.models.observation import Observation
from app.schemas.observations import (
    ObservationCreate,
    ObservationCreateResponse,
    ObservationListItem,
    ObservationRead,
    ObservationUpdate,
)
from app.schemas.pipeline import PipelineStatusResponse
from app.services.observations import ObservationService
from app.services.pipeline import ObservationPipelineService

router = APIRouter(prefix="/observations", tags=["observations"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


def parse_bbox(bbox: str | None) -> tuple[Decimal, Decimal, Decimal, Decimal] | None:
    if bbox is None:
        return None
    parts = bbox.split(",")
    if len(parts) != 4:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="bbox must be min_lon,min_lat,max_lon,max_lat",
        )
    try:
        min_lon, min_lat, max_lon, max_lat = (Decimal(part.strip()) for part in parts)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="bbox values must be decimal numbers",
        ) from exc
    if min_lon > max_lon or min_lat > max_lat:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="bbox minimums must be less than maximums",
        )
    return min_lon, min_lat, max_lon, max_lat


@router.post("", response_model=ObservationCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_observation(
    payload: ObservationCreate,
    session: SessionDep,
) -> ObservationCreateResponse:
    observation = await ObservationService(session).create_observation(payload)
    return ObservationCreateResponse(
        observation_id=observation.id,
        status="created",
        next_steps=[
            "Attach media evidence when available.",
            "Run species identification after media is attached.",
            "Enrich environmental context before scoring.",
        ],
    )


@router.get("", response_model=list[ObservationListItem])
async def list_observations(
    session: SessionDep,
    bbox: Annotated[str | None, Query(description="min_lon,min_lat,max_lon,max_lat")] = None,
    user_id: uuid.UUID | None = None,
    species_id: uuid.UUID | None = None,
    verification_status: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[Observation]:
    parsed_bbox = parse_bbox(bbox)
    _ = species_id, verification_status
    return await ObservationService(session).list_observations(
        bbox=parsed_bbox,
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
    )


@router.get("/{observation_id}", response_model=ObservationRead)
async def get_observation(
    observation_id: uuid.UUID,
    session: SessionDep,
) -> Observation:
    return await ObservationService(session).get_observation(observation_id)


@router.get("/{observation_id}/pipeline-status", response_model=PipelineStatusResponse)
async def get_pipeline_status(
    observation_id: uuid.UUID,
    session: SessionDep,
) -> PipelineStatusResponse:
    return await ObservationPipelineService(session).pipeline_status(observation_id)


@router.patch("/{observation_id}", response_model=ObservationRead)
async def update_observation(
    observation_id: uuid.UUID,
    payload: ObservationUpdate,
    session: SessionDep,
) -> Observation:
    return await ObservationService(session).update_observation(observation_id, payload)
