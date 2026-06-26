from datetime import UTC, datetime
from decimal import Decimal

from app.models import Observation, PrivacyLevel, Species
from app.services.privacy import CoordinatePrivacyService


def build_observation(privacy_level: PrivacyLevel) -> Observation:
    return Observation(
        timestamp=datetime(2026, 6, 26, 12, tzinfo=UTC),
        latitude=Decimal("40.718800"),
        longitude=Decimal("-74.006000"),
        privacy_level=privacy_level,
    )


def test_public_coordinates_are_exact_for_public_observations() -> None:
    observation = build_observation(PrivacyLevel.public)

    coordinates = CoordinatePrivacyService().public_coordinates(observation)

    assert coordinates == (Decimal("40.718800"), Decimal("-74.006000"))


def test_obscured_coordinates_are_generalized() -> None:
    observation = build_observation(PrivacyLevel.obscured)

    coordinates = CoordinatePrivacyService().public_coordinates(observation)

    assert coordinates == (Decimal("40.72"), Decimal("-74.01"))


def test_private_coordinates_hidden_from_public_serializers() -> None:
    observation = build_observation(PrivacyLevel.private)
    service = CoordinatePrivacyService()

    assert service.public_coordinates(observation) is None
    assert service.export_coordinates(observation, include_private=False) == ("", "")
    assert service.export_coordinates(observation, include_private=True) == (
        "40.718800",
        "-74.006000",
    )


def test_sensitive_species_flag_uses_species_metadata() -> None:
    sensitive = Species(
        scientific_name="Example sensitive plant",
        habitat_profile={"sensitive_species": True},
    )
    ordinary = Species(scientific_name="Example ordinary plant")

    service = CoordinatePrivacyService()

    assert service.is_sensitive_species(sensitive) is True
    assert service.is_sensitive_species(ordinary) is False
