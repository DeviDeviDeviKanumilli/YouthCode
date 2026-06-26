import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.identification import AIIdentification
from app.models.observation import Observation
from app.models.verification import VerificationStatus
from app.repositories.environmental_context import EnvironmentalContextRepository
from app.repositories.identifications import IdentificationRepository
from app.repositories.media import MediaRepository
from app.repositories.observations import ObservationRepository
from app.repositories.sampling_grid import SamplingGridRepository
from app.repositories.signal_scores import SignalScoreRepository
from app.repositories.verification import VerificationRepository
from app.schemas.assistant_context import ObservationAssistantContext, RegionAssistantContext
from app.services.nearby_records import NearbyRecordsService

UNKNOWN = "unknown"
VERIFIED_STATUSES = {
    VerificationStatus.expert_verified,
    VerificationStatus.field_confirmed,
}


class AssistantContextService:
    def __init__(self, session: AsyncSession) -> None:
        self.environmental_context = EnvironmentalContextRepository(session)
        self.identifications = IdentificationRepository(session)
        self.media = MediaRepository(session)
        self.nearby_records = NearbyRecordsService(session)
        self.observations = ObservationRepository(session)
        self.sampling_grid = SamplingGridRepository(session)
        self.signal_scores = SignalScoreRepository(session)
        self.verification = VerificationRepository(session)

    async def observation_context(
        self,
        observation_id: uuid.UUID,
    ) -> ObservationAssistantContext:
        observation = await self.observations.get(observation_id)
        if observation is None:
            raise AppError(
                code="observation_not_found",
                message="Observation was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        identification = await self._latest_identification(observation_id)
        context = await self.environmental_context.get(observation_id)
        score = await self.signal_scores.get(observation_id)
        verification = await self.verification.get(observation_id)
        verification_status = verification.status if verification else VerificationStatus.raw
        media_items = await self.media.list_for_observation(observation_id)
        sampling_cell = await self.sampling_grid.find_cell_for_point(
            latitude=observation.latitude,
            longitude=observation.longitude,
            region_code=observation.region_code,
        )
        nearby_summary = (
            await self.nearby_records.summarize_for_observation(
                observation_id,
                species_id=identification.candidate_species_id if identification else None,
                radius_km=Decimal("2"),
            )
            if identification and identification.candidate_species_id
            else None
        )
        return ObservationAssistantContext(
            observation_id=observation.id,
            observation=self._observation_payload(observation),
            media_metadata=[
                {
                    "media_id": str(item.id),
                    "file_type": item.file_type.value,
                    "mime_type": item.mime_type,
                    "storage_key": item.storage_key,
                    "public_url": item.public_url,
                    "quality_score": str(item.quality_score) if item.quality_score else None,
                    "metadata_removed": item.metadata_removed,
                    "created_at": item.created_at.isoformat(),
                }
                for item in media_items
            ],
            latest_identification=(
                self._identification_payload(identification) if identification else UNKNOWN
            ),
            environmental_context=(
                self._environmental_context_payload(context) if context else UNKNOWN
            ),
            signal_score=self._signal_score_payload(score) if score else UNKNOWN,
            verification_status=verification_status.value,
            nearby_records_summary=(
                nearby_summary.model_dump(mode="json") if nearby_summary else UNKNOWN
            ),
            sampling_gap_context=(
                {
                    "cell_id": str(sampling_cell.id),
                    "sampling_label": sampling_cell.sampling_label.value,
                    "observation_count": sampling_cell.observation_count,
                    "verified_count": sampling_cell.verified_count,
                    "recent_observation_count": sampling_cell.recent_observation_count,
                }
                if sampling_cell
                else UNKNOWN
            ),
            allowed_claims=self.allowed_claims(
                verification_status=verification_status,
                identification=identification,
                has_context=context is not None,
                has_signal_score=score is not None,
            ),
            required_uncertainty_notice=self.required_uncertainty_notice(verification_status),
            data_sources_used=self._data_sources(
                identification=identification,
                has_media=bool(media_items),
                has_context=context is not None,
                has_score=score is not None,
                has_verification=verification is not None,
                has_nearby_records=nearby_summary is not None,
                has_sampling_cell=sampling_cell is not None,
            ),
        )

    async def region_context(
        self,
        *,
        latitude: Decimal,
        longitude: Decimal,
        radius_km: Decimal,
    ) -> RegionAssistantContext:
        bbox = self._bbox_for_radius(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
        )
        observations = await self.observations.list(bbox=bbox, limit=100)
        sampling_cells = await self.sampling_grid.list_cells(bbox=bbox, limit=100)
        nearby_signals: list[dict[str, Any]] = []
        watched_species: dict[str, dict[str, Any]] = {}
        high_priority: list[dict[str, Any]] = []
        source_counts: dict[str, int] = {}
        for observation in observations:
            source_counts[observation.source.value] = (
                source_counts.get(observation.source.value, 0) + 1
            )
            identification = await self._latest_identification(observation.id)
            score = await self.signal_scores.get(observation.id)
            if identification is not None:
                species_key = (
                    str(identification.candidate_species_id)
                    if identification.candidate_species_id
                    else identification.candidate_scientific_name
                )
                watched_species[species_key] = {
                    "candidate_species_id": (
                        str(identification.candidate_species_id)
                        if identification.candidate_species_id
                        else UNKNOWN
                    ),
                    "scientific_name": identification.candidate_scientific_name,
                    "common_name": identification.candidate_common_name or UNKNOWN,
                    "evidence": "candidate_from_nearby_observation",
                }
            if score is None:
                continue
            signal_payload = {
                "observation_id": str(observation.id),
                "region_code": observation.region_code or UNKNOWN,
                "candidate_species": (
                    identification.candidate_common_name
                    or identification.candidate_scientific_name
                    if identification
                    else UNKNOWN
                ),
                "signal_label": score.label.value,
                "final_signal_priority": str(score.final_signal_priority),
                "observed_at": observation.timestamp.isoformat(),
            }
            nearby_signals.append(signal_payload)
            if score.label.value in {
                "priority_ecological_signal",
                "high_value_verification_candidate",
            }:
                high_priority.append(signal_payload)
        nearby_signals = sorted(
            nearby_signals,
            key=lambda item: Decimal(item["final_signal_priority"]),
            reverse=True,
        )[:10]
        high_priority = sorted(
            high_priority,
            key=lambda item: Decimal(item["final_signal_priority"]),
            reverse=True,
        )[:10]
        sampling_gaps = [
            {
                "cell_id": str(cell.id),
                "region_code": cell.region_code,
                "sampling_label": cell.sampling_label.value,
                "observation_count": cell.observation_count,
            }
            for cell in sampling_cells
            if cell.sampling_label.value
            in {
                "under_sampled",
                "high_risk_under_sampled",
                "needs_structured_survey",
                "likely_false_absence",
            }
        ][:10]
        return RegionAssistantContext(
            center={"latitude": str(latitude), "longitude": str(longitude)},
            radius_km=str(radius_km),
            nearby_signals=nearby_signals,
            watched_species=sorted(
                watched_species.values(),
                key=lambda item: item["scientific_name"],
            ),
            sampling_gaps=sampling_gaps,
            recent_high_priority_observations=high_priority,
            data_sparsity_warning=self._region_sparsity_warning(
                observation_count=len(observations),
                sampling_cell_count=len(sampling_cells),
            ),
            source_summaries={
                "observation_count": len(observations),
                "sampling_grid_cell_count": len(sampling_cells),
                "observation_sources": source_counts,
            },
            required_uncertainty_notice=(
                "This regional context summarizes available records only. Do not claim true "
                "absence, population trend, or treatment guidance from these data."
            ),
            data_sources_used=self._region_data_sources(
                has_observations=bool(observations),
                has_scores=bool(nearby_signals),
                has_sampling_cells=bool(sampling_cells),
            ),
        )

    def allowed_claims(
        self,
        *,
        verification_status: VerificationStatus,
        identification: AIIdentification | None,
        has_context: bool,
        has_signal_score: bool,
    ) -> list[str]:
        claims = ["State that uncertainty remains and cite the internal data sources used."]
        if verification_status in VERIFIED_STATUSES:
            claims.append("This observation may be described using its verified status.")
        elif identification is not None:
            claims.append("This observation may be described as an AI-assisted species candidate.")
            claims.append("Do not describe the candidate as confirmed or expert verified.")
        else:
            claims.append("Say there is insufficient evidence for a species-level claim.")
        if has_context:
            claims.append(
                "Environmental context may be summarized as supporting context, not proof."
            )
        if has_signal_score:
            claims.append("Signal score may be used for prioritization, not as a population trend.")
        return claims

    def required_uncertainty_notice(self, verification_status: VerificationStatus) -> str:
        if verification_status in VERIFIED_STATUSES:
            return (
                "This observation has verification support, but assistant responses must still "
                "state uncertainty for model-derived context and avoid treatment advice."
            )
        return (
            "This is not a confirmed identification. Assistant responses must present it as "
            "AI-assisted evidence, state uncertainty, and avoid treatment or handling advice."
        )

    async def _latest_identification(
        self,
        observation_id: uuid.UUID,
    ) -> AIIdentification | None:
        identifications = await self.identifications.list_for_observation(observation_id)
        return identifications[0] if identifications else None

    def _observation_payload(self, observation: Observation) -> dict[str, Any]:
        return {
            "id": str(observation.id),
            "timestamp": observation.timestamp.isoformat(),
            "latitude": str(observation.latitude),
            "longitude": str(observation.longitude),
            "coordinate_uncertainty_m": (
                str(observation.coordinate_uncertainty_m)
                if observation.coordinate_uncertainty_m is not None
                else UNKNOWN
            ),
            "region_code": observation.region_code or UNKNOWN,
            "source": observation.source.value,
            "privacy_level": observation.privacy_level.value,
            "habitat_answers": observation.habitat_answers,
        }

    def _identification_payload(self, identification: AIIdentification) -> dict[str, Any]:
        return {
            "identification_id": str(identification.id),
            "candidate_species_id": (
                str(identification.candidate_species_id)
                if identification.candidate_species_id
                else UNKNOWN
            ),
            "candidate_scientific_name": identification.candidate_scientific_name,
            "candidate_common_name": identification.candidate_common_name or UNKNOWN,
            "confidence": str(identification.confidence),
            "confidence_label": identification.confidence_label.value,
            "model_name": identification.model_name,
            "model_version": identification.model_version,
            "needs_verification": identification.needs_verification,
            "similar_species": identification.similar_species,
        }

    def _environmental_context_payload(self, context: Any) -> dict[str, Any]:
        return {
            "land_cover_class": context.land_cover_class or UNKNOWN,
            "tree_canopy_pct": (
                str(context.tree_canopy_pct) if context.tree_canopy_pct is not None else UNKNOWN
            ),
            "impervious_surface_pct": (
                str(context.impervious_surface_pct)
                if context.impervious_surface_pct is not None
                else UNKNOWN
            ),
            "ndvi_value": str(context.ndvi_value) if context.ndvi_value is not None else UNKNOWN,
            "distance_to_water_m": (
                str(context.distance_to_water_m)
                if context.distance_to_water_m is not None
                else UNKNOWN
            ),
            "distance_to_road_m": (
                str(context.distance_to_road_m)
                if context.distance_to_road_m is not None
                else UNKNOWN
            ),
            "distance_to_trail_m": (
                str(context.distance_to_trail_m)
                if context.distance_to_trail_m is not None
                else UNKNOWN
            ),
            "distance_to_park_m": (
                str(context.distance_to_park_m)
                if context.distance_to_park_m is not None
                else UNKNOWN
            ),
            "data_sources": context.data_sources,
            "enrichment_version": context.enrichment_version,
        }

    def _signal_score_payload(self, score: Any) -> dict[str, Any]:
        return {
            "final_signal_priority": str(score.final_signal_priority),
            "signal_label": score.label.value,
            "model_version": score.model_version,
            "reasons": score.reasons,
        }

    def _data_sources(
        self,
        *,
        identification: AIIdentification | None,
        has_media: bool,
        has_context: bool,
        has_score: bool,
        has_verification: bool,
        has_nearby_records: bool,
        has_sampling_cell: bool,
    ) -> list[str]:
        sources = ["observation"]
        if has_media:
            sources.append("media")
        if identification:
            sources.append(
                f"identification:{identification.model_name}:{identification.model_version}"
            )
        if has_context:
            sources.append("environmental_context")
        if has_score:
            sources.append("signal_score")
        if has_verification:
            sources.append("verification")
        if has_nearby_records:
            sources.append("nearby_records")
        if has_sampling_cell:
            sources.append("sampling_grid")
        return sources

    def _bbox_for_radius(
        self,
        *,
        latitude: Decimal,
        longitude: Decimal,
        radius_km: Decimal,
    ) -> tuple[Decimal, Decimal, Decimal, Decimal]:
        degree_delta = radius_km / Decimal("111")
        return (
            longitude - degree_delta,
            latitude - degree_delta,
            longitude + degree_delta,
            latitude + degree_delta,
        )

    def _region_sparsity_warning(
        self,
        *,
        observation_count: int,
        sampling_cell_count: int,
    ) -> str:
        if observation_count < 3 or sampling_cell_count == 0:
            return (
                "Sparse data in this area means no-sighting areas must be treated as "
                "unknown, not true absence."
            )
        return (
            "Regional records are available, but they still reflect reported observations "
            "rather than a complete census."
        )

    def _region_data_sources(
        self,
        *,
        has_observations: bool,
        has_scores: bool,
        has_sampling_cells: bool,
    ) -> list[str]:
        sources: list[str] = []
        if has_observations:
            sources.extend(["observations", "identifications"])
        if has_scores:
            sources.append("signal_scores")
        if has_sampling_cells:
            sources.append("sampling_grid")
        return sources or ["none_available"]
