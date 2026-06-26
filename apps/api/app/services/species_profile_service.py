import re
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.species import Species
from app.models.watch import SpeciesWatchProfile, WatchAssetImage


@dataclass(frozen=True)
class SpeciesWatchProfileBundle:
    profile: SpeciesWatchProfile
    species: Species
    asset: WatchAssetImage | None

    @property
    def key(self) -> str:
        return slugify(self.species.common_name or self.species.scientific_name)


class SpeciesProfileService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_profiles(self) -> list[SpeciesWatchProfileBundle]:
        result = await self.session.execute(
            select(SpeciesWatchProfile, Species)
            .join(Species, Species.id == SpeciesWatchProfile.species_id)
            .order_by(Species.common_name, Species.scientific_name)
        )
        assets = await self._species_assets()
        return [
            SpeciesWatchProfileBundle(
                profile=profile,
                species=species,
                asset=assets.get(profile.species_id),
            )
            for profile, species in result.all()
        ]

    async def get_profile_by_key(self, key: str) -> SpeciesWatchProfileBundle | None:
        profiles = await self.list_profiles()
        return next((profile for profile in profiles if profile.key == key), None)

    async def place_asset(self, place_type: str) -> WatchAssetImage | None:
        result = await self.session.execute(
            select(WatchAssetImage)
            .where(
                WatchAssetImage.entity_type == "place",
                WatchAssetImage.place_type == place_type,
            )
            .order_by(WatchAssetImage.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def place_assets(self) -> dict[str, WatchAssetImage]:
        result = await self.session.execute(
            select(WatchAssetImage).where(WatchAssetImage.entity_type == "place")
        )
        assets: dict[str, WatchAssetImage] = {}
        for asset in result.scalars().all():
            if asset.place_type is not None:
                assets[asset.place_type] = asset
        return assets

    async def _species_assets(self) -> dict[uuid.UUID, WatchAssetImage]:
        result = await self.session.execute(
            select(WatchAssetImage).where(WatchAssetImage.entity_type == "species")
        )
        assets: dict[uuid.UUID, WatchAssetImage] = {}
        for asset in result.scalars().all():
            if asset.entity_id is not None:
                assets[asset.entity_id] = asset
        return assets


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return normalized or "watch"
