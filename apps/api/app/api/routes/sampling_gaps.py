import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.schemas.forecast import GeoJSONFeatureCollection
from app.services.sampling_gaps import SamplingGapsService

router = APIRouter(prefix="/sampling-gaps", tags=["sampling-gaps"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get("", response_model=GeoJSONFeatureCollection)
async def list_sampling_gaps(
    session: SessionDep,
    bbox: Annotated[str | None, Query(max_length=120)] = None,
    region_code: Annotated[str | None, Query(max_length=32)] = None,
    species_id: uuid.UUID | None = None,
    mode: Literal["public", "research"] = "public",
) -> GeoJSONFeatureCollection:
    return await SamplingGapsService(session).list_sampling_gaps(
        bbox=bbox,
        region_code=region_code,
        species_id=species_id,
        mode=mode,
    )
