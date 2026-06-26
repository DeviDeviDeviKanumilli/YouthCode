import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.species import Species
from app.schemas.species import SpeciesCreate, SpeciesUpdate


class SpeciesRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, data: SpeciesCreate) -> Species:
        species = Species(**data.model_dump())
        self.session.add(species)
        await self.session.flush()
        await self.session.refresh(species)
        return species

    async def get(self, species_id: uuid.UUID) -> Species | None:
        return await self.session.get(Species, species_id)

    async def get_by_scientific_name(self, scientific_name: str) -> Species | None:
        result = await self.session.execute(
            select(Species).where(Species.scientific_name == scientific_name)
        )
        return result.scalar_one_or_none()

    async def search(self, query: str, limit: int = 20) -> list[Species]:
        like_query = f"%{query}%"
        result = await self.session.execute(
            select(Species)
            .where(
                or_(
                    Species.scientific_name.ilike(like_query),
                    Species.common_name.ilike(like_query),
                )
            )
            .order_by(Species.scientific_name)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def update(self, species: Species, data: SpeciesUpdate) -> Species:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(species, field, value)
        await self.session.flush()
        await self.session.refresh(species)
        return species
