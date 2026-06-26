import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.models.signal_score import SignalScoreLabel
from app.models.verification import VerificationStatus
from app.schemas.forecast import GeoJSONFeatureCollection
from app.services.forecast import ForecastService

router = APIRouter(prefix="/forecast", tags=["forecast"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get("/public", response_model=GeoJSONFeatureCollection)
async def public_forecast(
    session: SessionDep,
    bbox: Annotated[str | None, Query(max_length=120)] = None,
    lat: Annotated[Decimal | None, Query(ge=Decimal("-90"), le=Decimal("90"))] = None,
    lon: Annotated[Decimal | None, Query(ge=Decimal("-180"), le=Decimal("180"))] = None,
    radius_km: Annotated[Decimal | None, Query(gt=Decimal("0"), le=Decimal("100"))] = None,
    species_id: uuid.UUID | None = None,
    signal_type: SignalScoreLabel | None = None,
    verification_status: VerificationStatus | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    recent_days: Annotated[int | None, Query(ge=1, le=365)] = None,
) -> GeoJSONFeatureCollection:
    return await ForecastService(session).public_forecast(
        bbox=bbox,
        latitude=lat,
        longitude=lon,
        radius_km=radius_km,
        species_id=species_id,
        signal_type=signal_type,
        verification_status=verification_status,
        from_date=from_date,
        to_date=to_date,
        recent_days=recent_days,
    )


@router.get("/research", response_model=GeoJSONFeatureCollection)
async def research_forecast(
    session: SessionDep,
    requester_id: uuid.UUID,
    bbox: Annotated[str | None, Query(max_length=120)] = None,
    lat: Annotated[Decimal | None, Query(ge=Decimal("-90"), le=Decimal("90"))] = None,
    lon: Annotated[Decimal | None, Query(ge=Decimal("-180"), le=Decimal("180"))] = None,
    radius_km: Annotated[Decimal | None, Query(gt=Decimal("0"), le=Decimal("100"))] = None,
    species_id: uuid.UUID | None = None,
    verification_status: VerificationStatus | None = None,
    layer: Annotated[list[str] | None, Query()] = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    recent_days: Annotated[int | None, Query(ge=1, le=365)] = None,
) -> GeoJSONFeatureCollection:
    return await ForecastService(session).research_forecast(
        requester_id=requester_id,
        bbox=bbox,
        latitude=lat,
        longitude=lon,
        radius_km=radius_km,
        species_id=species_id,
        verification_status=verification_status,
        layers=layer,
        from_date=from_date,
        to_date=to_date,
        recent_days=recent_days,
    )
