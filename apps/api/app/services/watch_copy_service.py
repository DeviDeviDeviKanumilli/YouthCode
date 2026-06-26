from app.services.species_profile_service import SpeciesWatchProfileBundle

BANNED_WATCH_TERMS = {
    "confirmed invasion",
    "danger",
    "threat level",
    "guaranteed spread",
    "infestation",
    "you must report",
}


class WatchCopyService:
    def species_summary(
        self,
        bundle: SpeciesWatchProfileBundle,
        *,
        recent_count: int,
        nearest_meters: int | None,
        known_record_count: int,
        habitat_matches: list[str],
    ) -> str:
        species_name = bundle.species.common_name or bundle.species.scientific_name
        if recent_count > 0 and nearest_meters is not None:
            miles = max(1, round(nearest_meters / 1609))
            return self.ensure_safe(
                f"Recently reported within about {miles} miles. "
                f"Look for {species_name} where clear photos are possible."
            )
        if known_record_count > 0:
            return self.ensure_safe(
                f"Known records exist nearby. Look for {species_name} and take clear photos "
                "if you notice something similar."
            )
        if habitat_matches:
            return self.ensure_safe(
                f"Worth checking near {', '.join(habitat_matches[:2])}. "
                f"Look for signs of {species_name} without treating absence as proof."
            )
        return self.ensure_safe(bundle.profile.public_summary)

    def place_summary(self, place_type: str) -> str:
        summaries = {
            "creek_edges": (
                "Creek corridors nearby may be useful places to photograph plants and insects."
            ),
            "trail_entrances": (
                "Trail edges are easy places to notice plants, insects, and tree health changes."
            ),
            "park_boundaries": "Park edges can reveal changes between managed and wild spaces.",
            "street_trees": (
                "Street trees can show early signs of insect damage or canopy stress."
            ),
        }
        return self.ensure_safe(summaries.get(place_type, "This may be a useful place to notice."))

    def uncertainty_notice(self) -> str:
        return (
            "Watch suggestions are based on nearby records and habitat context. They are not "
            "confirmation that a species is present."
        )

    def ensure_safe(self, value: str) -> str:
        lowered = value.lower()
        for term in BANNED_WATCH_TERMS:
            if term in lowered:
                raise ValueError(f"Unsafe watch copy includes banned term: {term}")
        return value
