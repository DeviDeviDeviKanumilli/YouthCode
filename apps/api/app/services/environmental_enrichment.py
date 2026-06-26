import uuid
from abc import ABC, abstractmethod
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.observation import Observation
from app.repositories.observations import ObservationRepository
from app.schemas.environmental_enrichment import EnvironmentalContextResult

ENRICHED_FIELDS = (
    "land_cover_class",
    "tree_canopy_pct",
    "impervious_surface_pct",
    "ndvi_value",
    "distance_to_water_m",
    "distance_to_road_m",
    "distance_to_trail_m",
    "distance_to_park_m",
    "recent_temperature",
    "recent_precipitation",
)


class EnrichmentProviderUnavailableError(RuntimeError):
    pass


class EnvironmentalEnrichmentProvider(ABC):
    provider_name: str
    enrichment_version: str

    @abstractmethod
    async def enrich_observation(self, observation: Observation) -> EnvironmentalContextResult:
        raise NotImplementedError


class MockEnrichmentProvider(EnvironmentalEnrichmentProvider):
    provider_name = "mock_enrichment"
    enrichment_version = "mock-0.2.0"

    async def enrich_observation(self, observation: Observation) -> EnvironmentalContextResult:
        near_water = observation.habitat_answers.get("near_water") == "yes"
        region_code = observation.region_code or "unknown"
        return EnvironmentalContextResult(
            observation_id=observation.id,
            land_cover_class="developed_open_space",
            tree_canopy_pct=Decimal("38.50"),
            impervious_surface_pct=Decimal("22.00"),
            ndvi_value=Decimal("0.42"),
            distance_to_water_m=Decimal("75.00") if near_water else Decimal("250.00"),
            distance_to_road_m=Decimal("100.00"),
            distance_to_trail_m=Decimal("180.00"),
            distance_to_park_m=Decimal("420.00"),
            recent_temperature=Decimal("22.40"),
            recent_precipitation=Decimal("4.20"),
            data_sources=self._sources(
                provider=self.provider_name,
                note="Deterministic MVP enrichment for local development and tests.",
                region_code=region_code,
            ),
            enrichment_version=self.enrichment_version,
        )

    def _sources(
        self,
        *,
        provider: str,
        note: str,
        region_code: str,
    ) -> dict[str, object]:
        return {
            "provider": provider,
            "note": note,
            "observation_region": region_code,
            "fields": {field: provider for field in ENRICHED_FIELDS},
        }


class StaticGeoDataProvider(MockEnrichmentProvider):
    provider_name = "static_geo_data"
    enrichment_version = "static-demo-0.1.0"

    async def enrich_observation(self, observation: Observation) -> EnvironmentalContextResult:
        if observation.region_code not in {"NY", "NJ", "PA"}:
            return EnvironmentalContextResult(
                observation_id=observation.id,
                land_cover_class=None,
                tree_canopy_pct=None,
                impervious_surface_pct=None,
                ndvi_value=None,
                distance_to_water_m=None,
                distance_to_road_m=None,
                distance_to_trail_m=None,
                distance_to_park_m=None,
                recent_temperature=None,
                recent_precipitation=None,
                data_sources=self._sources(
                    provider=self.provider_name,
                    note="No static demo layer is available for this region.",
                    region_code=observation.region_code or "unknown",
                ),
                enrichment_version=self.enrichment_version,
            )
        return await super().enrich_observation(observation)


class PlaceholderExternalEnrichmentProvider(EnvironmentalEnrichmentProvider):
    provider_name = "external_enrichment_placeholder"
    enrichment_version = "external-placeholder-0.1.0"

    async def enrich_observation(self, observation: Observation) -> EnvironmentalContextResult:
        return EnvironmentalContextResult(
            observation_id=observation.id,
            land_cover_class=None,
            tree_canopy_pct=None,
            impervious_surface_pct=None,
            ndvi_value=None,
            distance_to_water_m=None,
            distance_to_road_m=None,
            distance_to_trail_m=None,
            distance_to_park_m=None,
            recent_temperature=None,
            recent_precipitation=None,
            data_sources={
                "provider": self.provider_name,
                "note": "External enrichment provider is not configured.",
                "fields": {field: "unavailable" for field in ENRICHED_FIELDS},
            },
            enrichment_version=self.enrichment_version,
        )


def get_enrichment_provider(provider_name: str = "mock") -> EnvironmentalEnrichmentProvider:
    if provider_name == "mock":
        return MockEnrichmentProvider()
    if provider_name == "static":
        return StaticGeoDataProvider()
    if provider_name == "external-placeholder":
        return PlaceholderExternalEnrichmentProvider()
    raise EnrichmentProviderUnavailableError(
        f"Environmental enrichment provider '{provider_name}' is not available."
    )


class EnvironmentalEnrichmentService:
    def __init__(self, session: AsyncSession) -> None:
        self.observations = ObservationRepository(session)

    async def enrich_observation(
        self,
        observation_id: uuid.UUID,
        provider_name: str = "mock",
    ) -> EnvironmentalContextResult:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        try:
            provider = get_enrichment_provider(provider_name)
        except EnrichmentProviderUnavailableError as exc:
            raise AppError(
                code="enrichment_provider_unavailable",
                message=str(exc),
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            ) from exc
        return await provider.enrich_observation(observation)
