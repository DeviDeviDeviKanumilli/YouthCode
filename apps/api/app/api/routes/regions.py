from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.schemas.regions import NearbyRegionSummary
from app.services.regions import RegionService

router = APIRouter(prefix="/regions", tags=["regions"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get("/nearby", response_model=NearbyRegionSummary)
async def nearby_region(
    session: SessionDep,
    lat: Annotated[Decimal, Query(ge=Decimal("-90"), le=Decimal("90"))],
    lon: Annotated[Decimal, Query(ge=Decimal("-180"), le=Decimal("180"))],
    radius_km: Annotated[Decimal, Query(gt=Decimal("0"), le=Decimal("100"))] = Decimal("10"),
) -> NearbyRegionSummary:
    return await RegionService(session).nearby_region(
        latitude=lat,
        longitude=lon,
        radius_km=radius_km,
    )
