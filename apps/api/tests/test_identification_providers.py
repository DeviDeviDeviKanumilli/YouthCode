import uuid
from decimal import Decimal

import pytest

from app.schemas.identifications import AIIdentificationCreate
from app.services.identification_providers import (
    IdentificationProviderUnavailableError,
    MockIdentificationProvider,
    PlaceholderExternalVisionProvider,
    get_identification_provider,
)


@pytest.mark.anyio
async def test_mock_identification_provider_is_deterministic() -> None:
    provider = MockIdentificationProvider()
    observation_id = uuid.UUID("11111111-1111-1111-1111-111111111111")
    media_id = uuid.UUID("22222222-2222-2222-2222-222222222222")

    first = await provider.identify_from_media(observation_id, media_id)
    second = await provider.identify_from_media(observation_id, media_id)

    assert first == second
    assert first.model_name == "mock-vision"
    assert first.needs_verification is True
    assert Decimal("0") <= first.confidence <= Decimal("1")
    assert first.raw_model_output["deterministic"] is True


@pytest.mark.anyio
async def test_mock_identification_result_converts_to_create_payload() -> None:
    provider = MockIdentificationProvider()
    result = await provider.identify_from_media(
        uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
    )

    payload = result.to_identification_create()

    assert isinstance(payload, AIIdentificationCreate)
    assert payload.candidate_scientific_name == result.candidate_scientific_name
    assert payload.confidence == result.confidence
    assert payload.model_name == "mock-vision"
    assert payload.needs_verification is True


@pytest.mark.anyio
async def test_placeholder_external_provider_fails_explicitly() -> None:
    provider = PlaceholderExternalVisionProvider()

    with pytest.raises(IdentificationProviderUnavailableError):
        await provider.identify_from_media(
            uuid.UUID("11111111-1111-1111-1111-111111111111"),
            uuid.UUID("22222222-2222-2222-2222-222222222222"),
        )


def test_unknown_identification_provider_fails_explicitly() -> None:
    with pytest.raises(IdentificationProviderUnavailableError):
        get_identification_provider("unknown")


def test_provider_registry_returns_mock_provider() -> None:
    assert isinstance(get_identification_provider(), MockIdentificationProvider)
