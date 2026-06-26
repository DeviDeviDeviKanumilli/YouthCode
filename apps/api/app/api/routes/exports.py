import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.models.export import Export
from app.schemas.exports import ExportCreate, ExportRead, ExportUpdate
from app.services.exports import ExportService

router = APIRouter(prefix="/research/exports", tags=["exports"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.post("", response_model=ExportRead, status_code=status.HTTP_201_CREATED)
async def create_export(
    payload: ExportCreate,
    session: SessionDep,
) -> Export:
    return await ExportService(session).create_export(payload)


@router.get("", response_model=list[ExportRead])
async def list_exports(
    session: SessionDep,
    requester_id: Annotated[uuid.UUID | None, Query()] = None,
) -> list[Export]:
    return await ExportService(session).list_exports(requester_id)


@router.get("/{export_id}", response_model=ExportRead)
async def get_export(
    export_id: uuid.UUID,
    session: SessionDep,
) -> Export:
    return await ExportService(session).get_export(export_id)


@router.patch("/{export_id}", response_model=ExportRead)
async def update_export(
    export_id: uuid.UUID,
    payload: ExportUpdate,
    session: SessionDep,
) -> Export:
    return await ExportService(session).update_export(export_id, payload)
