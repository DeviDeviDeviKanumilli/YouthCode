from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.identifications import IdentificationRepository
from app.repositories.observations import ObservationRepository
from app.repositories.signal_scores import SignalScoreRepository
from app.repositories.verification import VerificationRepository
from app.schemas.regions import NearbyRegionSummary, NearbySignalSummary, RegionMapPoint


class RegionService:
    def __init__(self, session: AsyncSession) -> None:
        self.observations = ObservationRepository(session)
        self.identifications = IdentificationRepository(session)
        self.signal_scores = SignalScoreRepository(session)
        self.verification = VerificationRepository(session)

    async def nearby_region(
        self,
        *,
        latitude: Decimal,
        longitude: Decimal,
        radius_km: Decimal,
    ) -> NearbyRegionSummary:
        degree_delta = radius_km / Decimal("111")
        bbox = (
            longitude - degree_delta,
            latitude - degree_delta,
            longitude + degree_delta,
            latitude + degree_delta,
        )
        observations = await self.observations.list(bbox=bbox, limit=25)
        points: list[RegionMapPoint] = []
        signals: list[NearbySignalSummary] = []
        watched_species: set[str] = set()

        for observation in observations:
            identifications = await self.identifications.list_for_observation(observation.id)
            latest_identification = identifications[0] if identifications else None
            signal_score = await self.signal_scores.get(observation.id)
            verification = await self.verification.get(observation.id)
            possible_species = None
            if latest_identification is not None:
                possible_species = (
                    latest_identification.candidate_common_name
                    or latest_identification.candidate_scientific_name
                )
                watched_species.add(possible_species)
            verification_status = verification.status.value if verification else "raw"
            signal_label = signal_score.label.value if signal_score else None
            point = RegionMapPoint(
                observation_id=observation.id,
                latitude=observation.latitude,
                longitude=observation.longitude,
                possible_species=possible_species,
                signal_label=signal_label,
                verification_status=verification_status,
                observed_at=observation.timestamp,
            )
            points.append(point)
            if signal_label is not None:
                signals.append(
                    NearbySignalSummary(
                        observation_id=observation.id,
                        signal_label=signal_label,
                        possible_species=possible_species,
                        verification_status=verification_status,
                    )
                )

        sparse = len(observations) < 5
        return NearbyRegionSummary(
            center_latitude=latitude,
            center_longitude=longitude,
            radius_km=radius_km,
            region_summary=self._region_summary(len(observations), sparse),
            nearby_signals=signals,
            watched_species=sorted(watched_species),
            under_sampled_note=self._under_sampled_note(sparse),
            recent_observations=points,
            simple_map_points=points,
            uncertainty_notice=(
                "Sparse data: absence of observations should not be treated as species absence."
                if sparse
                else "Nearby observations are community signals and may still be biased."
            ),
        )

    def _region_summary(self, observation_count: int, sparse: bool) -> str:
        if observation_count == 0:
            return "No nearby EcoSentinel observations are available yet."
        if sparse:
            return f"{observation_count} nearby observations are available, but data is sparse."
        return f"{observation_count} nearby observations are available for local context."

    def _under_sampled_note(self, sparse: bool) -> str:
        if sparse:
            return "This area may be under-sampled. More structured observations would help."
        return "This area has some recent observations, but sampling bias may still exist."
