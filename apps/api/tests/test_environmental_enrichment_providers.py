import uuid
from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.models.observation import Observation
from app.services.environmental_enrichment import (
    ENRICHED_FIELDS,
    EnrichmentProviderUnavailableError,
    MockEnrichmentProvider,
    PlaceholderExternalEnrichmentProvider,
    StaticGeoDataProvider,
    get_enrichment_provider,
)


def build_observation(region_code: str | None = "NY") -> Observation:
    return Observation(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        timestamp=datetime(2026, 6, 26, 12, 0, tzinfo=UTC),
        latitude=Decimal("40.7128"),
        longitude=Decimal("-74.0060"),
        region_code=region_code,
        habitat_answers={"near_water": "yes"},
    )


@pytest.mark.anyio
async def test_mock_enrichment_provider_returns_provenance_for_every_field() -> None:
    result = await MockEnrichmentProvider().enrich_observation(build_observation())

    assert result.enrichment_version == "mock-0.2.0"
    assert result.distance_to_water_m == Decimal("75.00")
    assert result.data_sources["provider"] == "mock_enrichment"
    field_sources = result.data_sources["fields"]
    assert set(ENRICHED_FIELDS).issubset(set(field_sources))


@pytest.mark.anyio
async def test_static_provider_missing_region_returns_nulls_not_crashes() -> None:
    result = await StaticGeoDataProvider().enrich_observation(build_observation(region_code="CA"))

    assert result.land_cover_class is None
    assert result.distance_to_water_m is None
    assert result.data_sources["provider"] == "static_geo_data"
    assert "No static demo layer" in result.data_sources["note"]


@pytest.mark.anyio
async def test_external_placeholder_returns_unavailable_sources() -> None:
    result = await PlaceholderExternalEnrichmentProvider().enrich_observation(build_observation())

    assert result.land_cover_class is None
    assert result.recent_temperature is None
    assert result.data_sources["provider"] == "external_enrichment_placeholder"
    assert result.data_sources["fields"]["land_cover_class"] == "unavailable"


def test_unknown_enrichment_provider_fails_explicitly() -> None:
    with pytest.raises(EnrichmentProviderUnavailableError):
        get_enrichment_provider("unknown")


def test_provider_registry_returns_mock_provider() -> None:
    assert isinstance(get_enrichment_provider(), MockEnrichmentProvider)
