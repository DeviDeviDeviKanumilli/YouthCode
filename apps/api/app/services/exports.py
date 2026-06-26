import json
import uuid
from base64 import b64encode
from csv import DictWriter
from datetime import UTC, datetime
from decimal import Decimal
from io import StringIO
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.export import Export, ExportFormat, ExportStatus
from app.models.identification import AIIdentification
from app.models.observation import Observation, PrivacyLevel
from app.models.signal_score import SignalScore
from app.models.user import UserRole
from app.models.verification import Verification
from app.repositories.environmental_context import EnvironmentalContextRepository
from app.repositories.exports import ExportRepository
from app.repositories.identifications import IdentificationRepository
from app.repositories.media import MediaRepository
from app.repositories.observations import ObservationRepository
from app.repositories.signal_scores import SignalScoreRepository
from app.repositories.species import SpeciesRepository
from app.repositories.users import UserRepository
from app.repositories.verification import VerificationRepository
from app.schemas.exports import ExportCreate, ExportUpdate, ResearchExportCreate
from app.services.nearby_records import NearbyRecordsService
from app.services.research_observations import ResearchObservationSearchService

CSV_COLUMNS = [
    "observation_id",
    "scientific_name",
    "common_name",
    "candidate_name",
    "verified_scientific_name",
    "latitude",
    "longitude",
    "coordinate_uncertainty_m",
    "timestamp",
    "source",
    "verification_status",
    "confidence",
    "confidence_label",
    "habitat_answers",
    "land_cover_class",
    "tree_canopy_pct",
    "impervious_surface_pct",
    "ndvi_value",
    "distance_to_water_m",
    "distance_to_road_m",
    "distance_to_trail_m",
    "distance_to_park_m",
    "nearby_records_count",
    "sampling_density_score",
    "final_signal_priority",
    "signal_label",
    "model_version",
    "license_or_consent_status",
]


class ExportService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = ExportRepository(session)
        self.environmental_context = EnvironmentalContextRepository(session)
        self.identifications = IdentificationRepository(session)
        self.media = MediaRepository(session)
        self.nearby_records = NearbyRecordsService(session)
        self.observations = ObservationRepository(session)
        self.signal_scores = SignalScoreRepository(session)
        self.species = SpeciesRepository(session)
        self.users = UserRepository(session)
        self.verification = VerificationRepository(session)
        self.session = session

    async def create_export(self, data: ExportCreate) -> Export:
        if data.requester_id is not None:
            requester = await self.users.get(data.requester_id)
            if requester is None:
                raise AppError(
                    code="requester_not_found",
                    message="Requester was not found.",
                    status_code=status.HTTP_404_NOT_FOUND,
                )
        export = await self.repository.create(data)
        await self.session.commit()
        return export

    async def create_research_export(self, data: ResearchExportCreate) -> Export:
        requester = await self.users.get(data.requester_id)
        if requester is None:
            raise AppError(
                code="requester_not_found",
                message="Requester was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if requester.role not in {UserRole.researcher, UserRole.reviewer, UserRole.admin}:
            raise AppError(
                code="research_export_forbidden",
                message="Only research, reviewer, or admin users can create research exports.",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        export_text = (
            await self._build_csv(data)
            if data.format == ExportFormat.csv
            else await self._build_geojson(data)
        )
        media_type = "text/csv" if data.format == ExportFormat.csv else "application/geo+json"
        download_url = f"data:{media_type};base64," + b64encode(export_text.encode()).decode()
        export = await self.repository.create(
            ExportCreate(
                requester_id=data.requester_id,
                format=data.format,
                filters={
                    **data.filters,
                    "include_media_urls": data.include_media_urls,
                    "include_environmental_context": data.include_environmental_context,
                    "include_signal_scores": data.include_signal_scores,
                    "include_verification": data.include_verification,
                },
                license_summary="Private records are excluded unless include_private is explicit.",
            )
        )
        updated = await self.repository.update(
            export,
            ExportUpdate(
                status=ExportStatus.complete,
                download_url=download_url,
                completed_at=datetime.now(UTC),
            ),
        )
        await self.session.commit()
        return updated

    async def _build_csv(self, data: ResearchExportCreate) -> str:
        rows = await ResearchObservationSearchService(self.session).search(
            requester_id=data.requester_id,
            species_id=self._uuid_filter(data.filters, "species_id"),
            candidate_name=self._str_filter(data.filters, "candidate_name"),
            verification_status=self._verification_status_filter(data.filters),
            signal_label=self._signal_label_filter(data.filters),
            min_signal_score=self._decimal_filter(data.filters, "min_signal_score"),
            max_signal_score=self._decimal_filter(data.filters, "max_signal_score"),
            bbox=self._str_filter(data.filters, "bbox"),
            region_code=self._str_filter(data.filters, "region_code"),
            from_date=self._datetime_filter(data.filters, "from_date"),
            to_date=self._datetime_filter(data.filters, "to_date"),
            has_media=self._bool_filter(data.filters, "has_media"),
            needs_review=self._bool_filter(data.filters, "needs_review"),
            sampling_label=None,
            limit=100,
            offset=0,
            sort="submitted_at_desc",
        )
        output = StringIO()
        writer = DictWriter(output, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        include_private = self._bool_filter(data.filters, "include_private") is True
        for item in rows.items:
            observation = await self.observations.get(item.observation_id)
            if observation is None:
                continue
            if observation.privacy_level == PrivacyLevel.private and not include_private:
                continue
            identification = await self._latest_identification(item.observation_id)
            score = await self.signal_scores.get(item.observation_id)
            verification = await self.verification.get(item.observation_id)
            context = await self.environmental_context.get(item.observation_id)
            writer.writerow(
                await self._csv_row(
                    observation=observation,
                    identification=identification,
                    score=score if data.include_signal_scores else None,
                    verification=verification if data.include_verification else None,
                    context=context if data.include_environmental_context else None,
                )
            )
        return output.getvalue()

    async def _build_geojson(self, data: ResearchExportCreate) -> str:
        rows = await ResearchObservationSearchService(self.session).search(
            requester_id=data.requester_id,
            species_id=self._uuid_filter(data.filters, "species_id"),
            candidate_name=self._str_filter(data.filters, "candidate_name"),
            verification_status=self._verification_status_filter(data.filters),
            signal_label=self._signal_label_filter(data.filters),
            min_signal_score=self._decimal_filter(data.filters, "min_signal_score"),
            max_signal_score=self._decimal_filter(data.filters, "max_signal_score"),
            bbox=self._str_filter(data.filters, "bbox"),
            region_code=self._str_filter(data.filters, "region_code"),
            from_date=self._datetime_filter(data.filters, "from_date"),
            to_date=self._datetime_filter(data.filters, "to_date"),
            has_media=self._bool_filter(data.filters, "has_media"),
            needs_review=self._bool_filter(data.filters, "needs_review"),
            sampling_label=None,
            limit=100,
            offset=0,
            sort="submitted_at_desc",
        )
        include_private = self._bool_filter(data.filters, "include_private") is True
        features: list[dict[str, Any]] = []
        for item in rows.items:
            observation = await self.observations.get(item.observation_id)
            if observation is None:
                continue
            if observation.privacy_level == PrivacyLevel.private and not include_private:
                continue
            latitude, longitude = self._export_coordinates(observation)
            if not latitude or not longitude:
                continue
            identification = await self._latest_identification(item.observation_id)
            score = await self.signal_scores.get(item.observation_id)
            verification = await self.verification.get(item.observation_id)
            context = await self.environmental_context.get(item.observation_id)
            properties: dict[str, Any] = {
                "observation_id": str(observation.id),
                "timestamp": observation.timestamp.isoformat(),
                "source": observation.source.value,
                "region_code": observation.region_code,
                "privacy_level": observation.privacy_level.value,
                "candidate_scientific_name": (
                    identification.candidate_scientific_name if identification else None
                ),
                "candidate_common_name": (
                    identification.candidate_common_name if identification else None
                ),
                "confidence": str(identification.confidence) if identification else None,
                "verification_status": verification.status.value if verification else "raw",
            }
            if data.include_signal_scores:
                properties["signal_score"] = (
                    {
                        "final_signal_priority": str(score.final_signal_priority),
                        "signal_label": score.label.value,
                        "model_version": score.model_version,
                    }
                    if score
                    else None
                )
            if data.include_environmental_context:
                properties["environmental_context"] = (
                    {
                        "land_cover_class": context.land_cover_class,
                        "tree_canopy_pct": (
                            str(context.tree_canopy_pct)
                            if context.tree_canopy_pct is not None
                            else None
                        ),
                        "impervious_surface_pct": (
                            str(context.impervious_surface_pct)
                            if context.impervious_surface_pct is not None
                            else None
                        ),
                        "ndvi_value": (
                            str(context.ndvi_value) if context.ndvi_value is not None else None
                        ),
                        "distance_to_water_m": (
                            str(context.distance_to_water_m)
                            if context.distance_to_water_m is not None
                            else None
                        ),
                    }
                    if context
                    else None
                )
            features.append(
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [float(longitude), float(latitude)],
                    },
                    "properties": properties,
                }
            )
        return json.dumps(
            {
                "type": "FeatureCollection",
                "features": features,
                "metadata": {
                    "feature_count": len(features),
                    "filters": data.filters,
                    "private_records": "excluded_by_default",
                },
            },
            separators=(",", ":"),
        )

    async def _csv_row(
        self,
        *,
        observation: Observation,
        identification: AIIdentification | None,
        score: SignalScore | None,
        verification: Verification | None,
        context: Any | None,
    ) -> dict[str, str]:
        verified_species = (
            await self.species.get(verification.verified_species_id)
            if verification and verification.verified_species_id
            else None
        )
        nearby_count = ""
        if identification and identification.candidate_species_id:
            nearby = await self.nearby_records.summarize_for_observation(
                observation.id,
                species_id=identification.candidate_species_id,
                radius_km=Decimal("2"),
            )
            nearby_count = str(nearby.record_count)
        latitude, longitude = self._export_coordinates(observation)
        return {
            "observation_id": str(observation.id),
            "scientific_name": identification.candidate_scientific_name if identification else "",
            "common_name": (
                identification.candidate_common_name
                if identification and identification.candidate_common_name
                else ""
            ),
            "candidate_name": (
                identification.candidate_common_name or identification.candidate_scientific_name
                if identification
                else ""
            ),
            "verified_scientific_name": (
                verified_species.scientific_name if verified_species else ""
            ),
            "latitude": latitude,
            "longitude": longitude,
            "coordinate_uncertainty_m": (
                str(observation.coordinate_uncertainty_m)
                if observation.coordinate_uncertainty_m is not None
                else ""
            ),
            "timestamp": observation.timestamp.isoformat(),
            "source": observation.source.value,
            "verification_status": verification.status.value if verification else "raw",
            "confidence": str(identification.confidence) if identification else "",
            "confidence_label": identification.confidence_label.value if identification else "",
            "habitat_answers": str(observation.habitat_answers),
            "land_cover_class": context.land_cover_class if context else "",
            "tree_canopy_pct": (
                str(context.tree_canopy_pct) if context and context.tree_canopy_pct else ""
            ),
            "impervious_surface_pct": (
                str(context.impervious_surface_pct)
                if context and context.impervious_surface_pct
                else ""
            ),
            "ndvi_value": str(context.ndvi_value) if context and context.ndvi_value else "",
            "distance_to_water_m": (
                str(context.distance_to_water_m) if context and context.distance_to_water_m else ""
            ),
            "distance_to_road_m": (
                str(context.distance_to_road_m) if context and context.distance_to_road_m else ""
            ),
            "distance_to_trail_m": (
                str(context.distance_to_trail_m) if context and context.distance_to_trail_m else ""
            ),
            "distance_to_park_m": (
                str(context.distance_to_park_m) if context and context.distance_to_park_m else ""
            ),
            "nearby_records_count": nearby_count,
            "sampling_density_score": "",
            "final_signal_priority": str(score.final_signal_priority) if score else "",
            "signal_label": score.label.value if score else "",
            "model_version": score.model_version if score else "",
            "license_or_consent_status": observation.privacy_level.value,
        }

    async def _latest_identification(
        self,
        observation_id: uuid.UUID,
    ) -> AIIdentification | None:
        identifications = await self.identifications.list_for_observation(observation_id)
        return identifications[0] if identifications else None

    def _export_coordinates(self, observation: Observation) -> tuple[str, str]:
        if observation.privacy_level == PrivacyLevel.private:
            return "", ""
        if observation.privacy_level == PrivacyLevel.obscured:
            return (
                str(observation.latitude.quantize(Decimal("0.01"))),
                str(observation.longitude.quantize(Decimal("0.01"))),
            )
        return str(observation.latitude), str(observation.longitude)

    def _uuid_filter(self, filters: dict[str, Any], key: str) -> uuid.UUID | None:
        value = filters.get(key)
        return uuid.UUID(str(value)) if value else None

    def _str_filter(self, filters: dict[str, Any], key: str) -> str | None:
        value = filters.get(key)
        return str(value) if value is not None else None

    def _decimal_filter(self, filters: dict[str, Any], key: str) -> Decimal | None:
        value = filters.get(key)
        return Decimal(str(value)) if value is not None else None

    def _bool_filter(self, filters: dict[str, Any], key: str) -> bool | None:
        value = filters.get(key)
        return bool(value) if value is not None else None

    def _datetime_filter(self, filters: dict[str, Any], key: str) -> datetime | None:
        value = filters.get(key)
        if value is None:
            return None
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))

    def _verification_status_filter(self, filters: dict[str, Any]) -> Any | None:
        from app.models.verification import VerificationStatus

        value = filters.get("verification_status")
        return VerificationStatus(str(value)) if value else None

    def _signal_label_filter(self, filters: dict[str, Any]) -> Any | None:
        from app.models.signal_score import SignalScoreLabel

        value = filters.get("signal_label")
        return SignalScoreLabel(str(value)) if value else None

    async def list_exports(self, requester_id: uuid.UUID | None = None) -> list[Export]:
        return await self.repository.list_for_requester(requester_id)

    async def get_export(self, export_id: uuid.UUID) -> Export:
        export = await self.repository.get(export_id)
        if export is None:
            raise AppError(
                code="export_not_found",
                message="Export was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return export

    async def update_export(self, export_id: uuid.UUID, data: ExportUpdate) -> Export:
        export = await self.get_export(export_id)
        updated = await self.repository.update(export, data)
        await self.session.commit()
        return updated
