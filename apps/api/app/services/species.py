import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.species import Species
from app.repositories.species import SpeciesRepository
from app.schemas.species import SpeciesCreate, SpeciesUpdate


class SpeciesService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = SpeciesRepository(session)
        self.session = session

    async def create_species(self, data: SpeciesCreate) -> Species:
        existing = await self.repository.get_by_scientific_name(data.scientific_name)
        if existing is not None:
            raise AppError(
                code="species_scientific_name_conflict",
                message="A species with this scientific name already exists.",
                status_code=status.HTTP_409_CONFLICT,
            )

        species = await self.repository.create(data)
        await self.session.commit()
        return species

    async def get_species(self, species_id: uuid.UUID) -> Species:
        species = await self.repository.get(species_id)
        if species is None:
            raise AppError(
                code="species_not_found",
                message="Species was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return species

    async def search_species(self, query: str) -> list[Species]:
        if not query.strip():
            return []
        return await self.repository.search(query.strip())

    async def update_species(self, species_id: uuid.UUID, data: SpeciesUpdate) -> Species:
        species = await self.get_species(species_id)
        if data.scientific_name and data.scientific_name != species.scientific_name:
            existing = await self.repository.get_by_scientific_name(data.scientific_name)
            if existing is not None:
                raise AppError(
                    code="species_scientific_name_conflict",
                    message="A species with this scientific name already exists.",
                    status_code=status.HTTP_409_CONFLICT,
                )

        updated_species = await self.repository.update(species, data)
        await self.session.commit()
        return updated_species
