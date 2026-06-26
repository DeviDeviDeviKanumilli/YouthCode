from decimal import Decimal

from app.models.observation import Observation, PrivacyLevel
from app.models.species import Species


class CoordinatePrivacyService:
    def public_coordinates(self, observation: Observation) -> tuple[Decimal, Decimal] | None:
        if observation.privacy_level == PrivacyLevel.private:
            return None
        if observation.privacy_level == PrivacyLevel.obscured:
            return self.generalized_coordinates(observation)
        return observation.latitude, observation.longitude

    def export_coordinates(
        self,
        observation: Observation,
        *,
        include_private: bool,
    ) -> tuple[str, str]:
        if observation.privacy_level == PrivacyLevel.private and not include_private:
            return "", ""
        if observation.privacy_level == PrivacyLevel.obscured:
            latitude, longitude = self.generalized_coordinates(observation)
            return str(latitude), str(longitude)
        return str(observation.latitude), str(observation.longitude)

    def generalized_coordinates(self, observation: Observation) -> tuple[Decimal, Decimal]:
        return (
            observation.latitude.quantize(Decimal("0.01")),
            observation.longitude.quantize(Decimal("0.01")),
        )

    def license_status(self, observation: Observation, *, include_private: bool) -> str:
        if observation.privacy_level == PrivacyLevel.private and include_private:
            return "private_admin_override"
        if observation.privacy_level == PrivacyLevel.obscured:
            return "obscured_generalized"
        return observation.privacy_level.value

    def is_sensitive_species(self, species: Species | None) -> bool:
        if species is None:
            return False
        habitat_profile = species.habitat_profile or {}
        invasive_status = species.invasive_status_by_state or {}
        return bool(
            habitat_profile.get("sensitive_species")
            or invasive_status.get("sensitive_species")
        )
