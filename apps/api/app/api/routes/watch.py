from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.schemas.watch import GoodPlaceDetail, WatchItemDetail, WatchScreenResponse
from app.services.watch_service import WatchService

router = APIRouter(prefix="/consumer/watch", tags=["consumer-watch"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get("", response_model=WatchScreenResponse)
async def watch_screen(
    session: SessionDep,
    lat: Annotated[Decimal, Query(ge=Decimal("-90"), le=Decimal("90"))],
    lon: Annotated[Decimal, Query(ge=Decimal("-180"), le=Decimal("180"))],
    radius_km: Annotated[Decimal, Query(gt=Decimal("0"), le=Decimal("25"))] = Decimal("5"),
) -> WatchScreenResponse:
    return await WatchService(session).watch_screen(
        latitude=lat,
        longitude=lon,
        radius_km=radius_km,
    )


@router.get("/items/{watch_item_id}", response_model=WatchItemDetail)
async def watch_item_detail(
    watch_item_id: str,
    session: SessionDep,
) -> WatchItemDetail:
    return await WatchService(session).item_detail(watch_item_id)


@router.get("/places/{place_id}", response_model=GoodPlaceDetail)
async def watch_place_detail(
    place_id: str,
    session: SessionDep,
) -> GoodPlaceDetail:
    return await WatchService(session).place_detail(place_id)
