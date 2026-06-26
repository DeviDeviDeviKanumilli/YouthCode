import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.verification import VerificationStatus
from app.repositories.observations import ObservationRepository
from app.repositories.species import SpeciesRepository
from app.schemas.nearby_records import NearbyRecordsSummary
from app.schemas.static_geo_layers import NearbyKnownRecord
from app.services.static_geo_layers import StaticGeoLayerService

VERIFIED_RECORD_STATUSES = {
    VerificationStatus.expert_verified,
    VerificationStatus.field_confirmed,
}


class NearbyRecordsService:
    def __init__(self, session: AsyncSession) -> None:
        self.observations = ObservationRepository(session)
        self.species = SpeciesRepository(session)
        self.static_layers = StaticGeoLayerService(session)

    async def summarize_for_observation(
        self,
        observation_id: uuid.UUID,
        *,
        species_id: uuid.UUID | None,
        radius_km: Decimal,
    ) -> NearbyRecordsSummary:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if species_id is not None:
            species = await self.species.get(species_id)
            if species is None:
                raise AppError(
                    code="species_not_found",
                    message="Species was not found.",
                    status_code=status.HTTP_404_NOT_FOUND,
                )
        records = await self.static_layers.nearby_known_records(
            observation.latitude,
            observation.longitude,
            radius_m=radius_km * Decimal("1000"),
            species_id=species_id,
        )
        return NearbyRecordsSummary(
            observation_id=observation_id,
            species_id=species_id,
            radius_km=radius_km,
            record_count=len(records),
            nearest_distance_m=self._nearest_distance(records),
            sources=sorted({record.source for record in records}),
            verified_count=sum(
                1 for record in records if record.verification_status in VERIFIED_RECORD_STATUSES
            ),
            unverified_count=sum(
                1
                for record in records
                if record.verification_status not in VERIFIED_RECORD_STATUSES
            ),
            records=records,
        )

    def _nearest_distance(self, records: list[NearbyKnownRecord]) -> Decimal | None:
        if not records:
            return None
        return min(record.distance_m for record in records)
