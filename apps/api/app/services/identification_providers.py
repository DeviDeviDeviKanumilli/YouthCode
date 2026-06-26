import hashlib
import uuid
from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any, TypedDict

from app.schemas.identification_providers import IdentificationResult


class MockCandidate(TypedDict):
    scientific_name: str
    common_name: str
    similar_species: list[dict[str, Any]]


class IdentificationProviderUnavailableError(RuntimeError):
    pass


class IdentificationProvider(ABC):
    provider_name: str

    @abstractmethod
    async def identify_from_media(
        self,
        observation_id: uuid.UUID,
        media_id: uuid.UUID,
    ) -> IdentificationResult:
        raise NotImplementedError


class MockIdentificationProvider(IdentificationProvider):
    provider_name = "mock-vision"
    model_version = "0.1.0"

    _candidates: tuple[MockCandidate, ...] = (
        {
            "scientific_name": "Fallopia japonica",
            "common_name": "Japanese knotweed",
            "similar_species": [{"scientific_name": "Reynoutria sachalinensis"}],
        },
        {
            "scientific_name": "Lycorma delicatula",
            "common_name": "Spotted lanternfly",
            "similar_species": [{"scientific_name": "Acanalonia conica"}],
        },
        {
            "scientific_name": "Lythrum salicaria",
            "common_name": "Purple loosestrife",
            "similar_species": [{"scientific_name": "Lythrum alatum"}],
        },
        {
            "scientific_name": "Trapa natans",
            "common_name": "Water chestnut",
            "similar_species": [{"scientific_name": "Trapa bispinosa"}],
        },
    )

    async def identify_from_media(
        self,
        observation_id: uuid.UUID,
        media_id: uuid.UUID,
    ) -> IdentificationResult:
        digest = hashlib.sha256(f"{observation_id}:{media_id}".encode()).digest()
        candidate = self._candidates[digest[0] % len(self._candidates)]
        confidence = (Decimal(55 + digest[1] % 40) / Decimal("100")).quantize(
            Decimal("0.01")
        )
        return IdentificationResult(
            candidate_scientific_name=candidate["scientific_name"],
            candidate_common_name=candidate["common_name"],
            confidence=confidence,
            model_name=self.provider_name,
            model_version=self.model_version,
            similar_species=list(candidate["similar_species"]),
            raw_model_output={
                "provider": self.provider_name,
                "observation_id": str(observation_id),
                "media_id": str(media_id),
                "deterministic": True,
            },
            needs_verification=True,
        )


class PlaceholderExternalVisionProvider(IdentificationProvider):
    provider_name = "external-vision-placeholder"

    async def identify_from_media(
        self,
        observation_id: uuid.UUID,
        media_id: uuid.UUID,
    ) -> IdentificationResult:
        raise IdentificationProviderUnavailableError(
            "External vision identification provider is not configured."
        )


def get_identification_provider(provider_name: str = "mock") -> IdentificationProvider:
    if provider_name == "mock":
        return MockIdentificationProvider()
    if provider_name == "external-placeholder":
        return PlaceholderExternalVisionProvider()
    raise IdentificationProviderUnavailableError(
        f"Identification provider '{provider_name}' is not available."
    )
