import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.schemas.nearby_records import NearbyRecordsSummary
from app.services.nearby_records import NearbyRecordsService

router = APIRouter(tags=["nearby-records"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get(
    "/observations/{observation_id}/nearby-records",
    response_model=NearbyRecordsSummary,
)
async def nearby_records_summary(
    observation_id: uuid.UUID,
    session: SessionDep,
    species_id: uuid.UUID | None = None,
    radius_km: Annotated[Decimal, Query(gt=Decimal("0"), le=Decimal("100"))] = Decimal("5"),
) -> NearbyRecordsSummary:
    return await NearbyRecordsService(session).summarize_for_observation(
        observation_id,
        species_id=species_id,
        radius_km=radius_km,
    )
