import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.models.species import Species
from app.schemas.species import SpeciesCreate, SpeciesRead, SpeciesUpdate
from app.services.species import SpeciesService

router = APIRouter(prefix="/species", tags=["species"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.post("", response_model=SpeciesRead, status_code=status.HTTP_201_CREATED)
async def create_species(
    payload: SpeciesCreate,
    session: SessionDep,
) -> Species:
    return await SpeciesService(session).create_species(payload)


@router.get("/search", response_model=list[SpeciesRead])
async def search_species(
    session: SessionDep,
    q: Annotated[str, Query(min_length=1, max_length=100)],
) -> list[Species]:
    return await SpeciesService(session).search_species(q)


@router.get("/{species_id}", response_model=SpeciesRead)
async def get_species(
    species_id: uuid.UUID,
    session: SessionDep,
) -> Species:
    return await SpeciesService(session).get_species(species_id)


@router.patch("/{species_id}", response_model=SpeciesRead)
async def update_species(
    species_id: uuid.UUID,
    payload: SpeciesUpdate,
    session: SessionDep,
) -> Species:
    return await SpeciesService(session).update_species(species_id, payload)
