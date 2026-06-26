import re

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.species import Species
from app.repositories.species import SpeciesRepository
from app.schemas.taxonomy import TaxonomyMatchType, TaxonomyNormalizationResult


class TaxonomyNormalizationService:
    def __init__(self, session: AsyncSession) -> None:
        self.species = SpeciesRepository(session)

    async def normalize_candidate(
        self,
        *,
        candidate_scientific_name: str,
        candidate_common_name: str | None,
    ) -> TaxonomyNormalizationResult:
        species_records = await self.species.list_all()
        scientific_key = self._normalize(candidate_scientific_name)
        common_key = self._normalize(candidate_common_name)

        for species in species_records:
            if self._normalize(species.scientific_name) == scientific_key:
                return self._matched(species, TaxonomyMatchType.scientific_name)

        if common_key:
            for species in species_records:
                common_names = [species.common_name, *species.common_names]
                if common_key in {self._normalize(name) for name in common_names if name}:
                    return self._matched(species, TaxonomyMatchType.common_name)

        candidate_keys = {scientific_key}
        if common_key:
            candidate_keys.add(common_key)
        for species in species_records:
            synonym_keys = {self._normalize(synonym) for synonym in species.synonyms}
            if candidate_keys & synonym_keys:
                return self._matched(species, TaxonomyMatchType.synonym)

        return TaxonomyNormalizationResult(
            species_id=None,
            matched_by=None,
            resolved_scientific_name=None,
            resolved_common_name=None,
            unresolved_candidate_scientific_name=candidate_scientific_name,
            unresolved_candidate_common_name=candidate_common_name,
        )

    def _matched(
        self,
        species: Species,
        matched_by: TaxonomyMatchType,
    ) -> TaxonomyNormalizationResult:
        return TaxonomyNormalizationResult(
            species_id=species.id,
            matched_by=matched_by,
            resolved_scientific_name=species.scientific_name,
            resolved_common_name=species.common_name,
            unresolved_candidate_scientific_name=None,
            unresolved_candidate_common_name=None,
        )

    def _normalize(self, value: str | None) -> str:
        if value is None:
            return ""
        return re.sub(r"\s+", " ", value.strip().casefold())
