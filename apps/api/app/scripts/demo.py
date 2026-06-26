import asyncio
import json
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models import ExportFormat, MediaFileType, ObservationSource, PrivacyLevel, UserRole
from app.models.verification import VerificationStatus
from app.repositories.species import SpeciesRepository
from app.schemas.exports import ResearchExportCreate
from app.schemas.identifications import AIIdentificationRunCreate
from app.schemas.media import MediaCreate
from app.schemas.observations import ObservationCreate
from app.schemas.users import UserCreate
from app.schemas.verification import VerificationAction
from app.scripts.seed import seed_demo_region
from app.services.environmental_context import EnvironmentalContextService
from app.services.exports import ExportService
from app.services.forecast import ForecastService
from app.services.identifications import IdentificationService
from app.services.intelligence_cards import IntelligenceCardService
from app.services.media import MediaService
from app.services.observations import ObservationService
from app.services.signal_scores import SignalScoreService
from app.services.users import UserService
from app.services.verification import VerificationService

DEMO_BBOX = "-74.03,40.69,-73.98,40.75"


async def run_demo(session: AsyncSession) -> dict[str, Any]:
    seed_counts = await seed_demo_region(session)
    suffix = datetime.now(UTC).strftime("%Y%m%d%H%M%S%f")
    user_service = UserService(session)
    consumer = await user_service.create_user(
        UserCreate(
            email=f"demo-consumer-{suffix}@example.com",
            display_name="Demo Consumer",
            role=UserRole.consumer,
        )
    )
    reviewer = await user_service.create_user(
        UserCreate(
            email=f"demo-reviewer-{suffix}@example.com",
            display_name="Demo Reviewer",
            role=UserRole.reviewer,
            school_or_org="EcoSentinel Demo Lab",
        )
    )

    observation = await ObservationService(session).create_observation(
        ObservationCreate(
            user_id=consumer.id,
            timestamp=datetime.now(UTC),
            latitude=Decimal("40.714000"),
            longitude=Decimal("-74.006000"),
            region_code="NY",
            source=ObservationSource.consumer_app,
            raw_note="Backend demo sighting near Demo Creek.",
            habitat_answers={
                "organism_type": "plant",
                "growth_pattern": "patch",
                "near_water": "yes",
                "near_road_or_trail": "yes",
                "habitat_type": "wetland",
            },
            privacy_level=PrivacyLevel.obscured,
        )
    )
    media = await MediaService(session).create_media(
        observation.id,
        MediaCreate(
            file_type=MediaFileType.image,
            mime_type="image/jpeg",
            storage_key=f"demo/{observation.id}/photo.jpg",
            public_url="https://example.test/ecosentinel/demo-photo.jpg",
            original_filename="demo-photo.jpg",
            size_bytes=512_000,
            quality_score=Decimal("91.50"),
            metadata_removed=True,
        ),
    )
    identification = await IdentificationService(session).identify_from_media(
        observation.id,
        AIIdentificationRunCreate(media_id=media.id),
    )
    context = await EnvironmentalContextService(session).enrich_context(
        observation.id,
        provider_name="static",
    )
    score = await SignalScoreService(session).recompute_score(observation.id)
    card = await IntelligenceCardService(session).get_card(observation.id)
    forecast = await ForecastService(session).public_forecast(
        bbox=DEMO_BBOX,
        latitude=None,
        longitude=None,
        radius_km=None,
        species_id=None,
        signal_type=None,
        verification_status=None,
        from_date=None,
        to_date=None,
        recent_days=None,
    )
    verification_service = VerificationService(session)
    queue_before = await verification_service.verification_queue(reviewer.id)
    verified_species_id = identification.candidate_species_id
    if verified_species_id is None:
        species = await SpeciesRepository(session).get_by_scientific_name("Fallopia japonica")
        if species is None:
            raise RuntimeError("Demo species seed did not create Japanese knotweed.")
        verified_species_id = species.id
    verification = await verification_service.apply_action(
        observation.id,
        VerificationAction(
            status=VerificationStatus.field_confirmed,
            reviewer_id=reviewer.id,
            verified_species_id=verified_species_id,
            review_notes="Backend demo verification action.",
        ),
    )
    export_service = ExportService(session)
    export_filters = {"region_code": "NY"}
    csv_export = await export_service.create_research_export(
        ResearchExportCreate(
            requester_id=reviewer.id,
            format=ExportFormat.csv,
            filters=export_filters,
        )
    )
    geojson_export = await export_service.create_research_export(
        ResearchExportCreate(
            requester_id=reviewer.id,
            format=ExportFormat.geojson,
            filters=export_filters,
        )
    )
    return {
        "seed": seed_counts,
        "consumer_experience": {
            "user_id": str(consumer.id),
            "observation_id": str(observation.id),
            "media_id": str(media.id),
            "candidate_species": identification.candidate_common_name
            or identification.candidate_scientific_name,
            "confidence_label": identification.confidence_label.value,
            "environmental_context_version": context.enrichment_version,
            "signal_label": score.label.value,
            "signal_priority": str(score.final_signal_priority),
            "intelligence_card_status": card.verification_status,
            "forecast_feature_count": forecast.metadata["feature_count"],
        },
        "research_experience": {
            "reviewer_id": str(reviewer.id),
            "queue_count_before_verification": len(queue_before),
            "verification_status": verification.status.value,
            "csv_export_status": csv_export.status.value,
            "csv_export_url_prefix": (csv_export.download_url or "")[:32],
            "geojson_export_status": geojson_export.status.value,
            "geojson_export_url_prefix": (geojson_export.download_url or "")[:39],
        },
    }


async def main_async() -> None:
    async with AsyncSessionLocal() as session:
        result = await run_demo(session)
    print(json.dumps(result, indent=2, sort_keys=True))


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
