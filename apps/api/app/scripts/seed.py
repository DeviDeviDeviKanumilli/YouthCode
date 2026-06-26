import asyncio
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models import (
    AIIdentification,
    ConfidenceLabel,
    EnvironmentalContext,
    KnownRecord,
    Observation,
    ObservationSource,
    SamplingGridCell,
    SamplingLabel,
    SignalScore,
    SignalScoreLabel,
    StaticPark,
    StaticRoadTrail,
    StaticWaterway,
    Verification,
    VerificationStatus,
)
from app.repositories.species import SpeciesRepository
from app.schemas.species import SpeciesCreate, SpeciesUpdate

MVP_SPECIES: tuple[SpeciesCreate, ...] = (
    SpeciesCreate(
        scientific_name="Fallopia japonica",
        common_name="Japanese knotweed",
        common_names=["Japanese knotweed", "Asian knotweed"],
        kingdom="Plantae",
        taxon_rank="species",
        native_status_by_state={"NY": "non_native", "NJ": "non_native", "PA": "non_native"},
        invasive_status_by_state={"NY": "regulated", "NJ": "invasive", "PA": "invasive"},
        habitat_profile={
            "preferred_habitats": ["riparian corridors", "roadsides", "disturbed edges"],
            "moisture": "mesic_to_wet",
        },
        pathway_profile={
            "spread": ["rhizomes", "soil movement", "yard waste"],
            "human_pathways": ["construction fill", "landscaping"],
        },
        synonyms=["Reynoutria japonica", "Polygonum cuspidatum"],
    ),
    SpeciesCreate(
        scientific_name="Lycorma delicatula",
        common_name="Spotted lanternfly",
        common_names=["Spotted lanternfly"],
        kingdom="Animalia",
        taxon_rank="species",
        native_status_by_state={"NY": "non_native", "NJ": "non_native", "PA": "non_native"},
        invasive_status_by_state={"NY": "watch", "NJ": "invasive", "PA": "invasive"},
        habitat_profile={
            "preferred_habitats": ["urban tree canopy", "orchards", "forest edges"],
            "host_notes": ["tree of heaven", "grape", "maple"],
        },
        pathway_profile={
            "spread": ["egg masses", "short-distance hopping"],
            "human_pathways": ["vehicles", "outdoor equipment", "nursery stock"],
        },
        synonyms=[],
    ),
    SpeciesCreate(
        scientific_name="Agrilus planipennis",
        common_name="Emerald ash borer",
        common_names=["Emerald ash borer", "EAB"],
        kingdom="Animalia",
        taxon_rank="species",
        native_status_by_state={"NY": "non_native", "NJ": "non_native", "PA": "non_native"},
        invasive_status_by_state={"NY": "invasive", "NJ": "invasive", "PA": "invasive"},
        habitat_profile={
            "preferred_habitats": ["ash stands", "urban ash trees", "riparian forests"],
            "host_notes": ["Fraxinus species"],
        },
        pathway_profile={
            "spread": ["adult flight", "infested wood"],
            "human_pathways": ["firewood", "nursery stock", "wood packing material"],
        },
        synonyms=[],
    ),
    SpeciesCreate(
        scientific_name="Trapa natans",
        common_name="Water chestnut",
        common_names=["Water chestnut", "European water chestnut"],
        kingdom="Plantae",
        taxon_rank="species",
        native_status_by_state={"NY": "non_native", "NJ": "non_native", "PA": "non_native"},
        invasive_status_by_state={"NY": "invasive", "NJ": "invasive", "PA": "invasive"},
        habitat_profile={
            "preferred_habitats": ["slow freshwater", "ponds", "lakes", "backwaters"],
            "moisture": "aquatic",
        },
        pathway_profile={
            "spread": ["floating rosettes", "seeds", "water movement"],
            "human_pathways": ["boats", "trailers", "water garden disposal"],
        },
        synonyms=["Trapa bicornis"],
    ),
    SpeciesCreate(
        scientific_name="Lythrum salicaria",
        common_name="Purple loosestrife",
        common_names=["Purple loosestrife"],
        kingdom="Plantae",
        taxon_rank="species",
        native_status_by_state={"NY": "non_native", "NJ": "non_native", "PA": "non_native"},
        invasive_status_by_state={"NY": "invasive", "NJ": "invasive", "PA": "invasive"},
        habitat_profile={
            "preferred_habitats": ["wetlands", "streambanks", "ditches"],
            "moisture": "wet",
        },
        pathway_profile={
            "spread": ["seeds", "root fragments"],
            "human_pathways": ["horticulture", "soil movement"],
        },
        synonyms=[],
    ),
)


async def seed_species(session: AsyncSession) -> int:
    repository = SpeciesRepository(session)
    created_count = 0
    for payload in MVP_SPECIES:
        existing = await repository.get_by_scientific_name(payload.scientific_name)
        if existing is None:
            await repository.create(payload)
            created_count += 1
        else:
            await repository.update(
                existing,
                SpeciesUpdate(**payload.model_dump()),
            )
    await session.commit()
    return created_count


async def seed_demo_region(session: AsyncSession) -> dict[str, int]:
    await seed_species(session)
    species_repository = SpeciesRepository(session)
    knotweed = await species_repository.get_by_scientific_name("Fallopia japonica")
    loosestrife = await species_repository.get_by_scientific_name("Lythrum salicaria")
    if knotweed is None or loosestrife is None:
        raise RuntimeError("MVP species were not seeded.")

    await _clear_demo_region(session)
    session.add_all(
        [
            StaticWaterway(
                name="Demo Creek",
                geom="MULTILINESTRING((-74.020 40.700,-73.990 40.730))",
                representative_latitude=Decimal("40.715000"),
                representative_longitude=Decimal("-74.005000"),
                source="demo_seed",
            ),
            StaticRoadTrail(
                name="Demo Greenway",
                type="trail",
                geom="MULTILINESTRING((-74.010 40.700,-74.000 40.735))",
                representative_latitude=Decimal("40.718000"),
                representative_longitude=Decimal("-74.004000"),
                source="demo_seed",
            ),
            StaticPark(
                name="Demo Park",
                geom=(
                    "MULTIPOLYGON(((-74.015 40.710,-74.000 40.710,"
                    "-74.000 40.725,-74.015 40.710)))"
                ),
                representative_latitude=Decimal("40.718000"),
                representative_longitude=Decimal("-74.008000"),
                source="demo_seed",
            ),
            KnownRecord(
                species_id=knotweed.id,
                observed_at=datetime(2026, 5, 20, tzinfo=UTC),
                verification_status=VerificationStatus.expert_verified,
                source="demo_seed",
                geom="POINT(-74.006 40.713)",
                latitude=Decimal("40.713000"),
                longitude=Decimal("-74.006000"),
            ),
            KnownRecord(
                species_id=loosestrife.id,
                observed_at=datetime(2026, 5, 22, tzinfo=UTC),
                verification_status=VerificationStatus.field_confirmed,
                source="demo_seed",
                geom="POINT(-74.002 40.720)",
                latitude=Decimal("40.720000"),
                longitude=Decimal("-74.002000"),
            ),
        ]
    )
    observations = [
        Observation(
            timestamp=datetime(2026, 6, 26, 12, tzinfo=UTC),
            latitude=Decimal("40.714000"),
            longitude=Decimal("-74.006000"),
            region_code="NY",
            source=ObservationSource.demo_seed,
            habitat_answers={"scenario": "student_creek"},
        ),
        Observation(
            timestamp=datetime(2026, 6, 25, 12, tzinfo=UTC),
            latitude=Decimal("40.721000"),
            longitude=Decimal("-74.004000"),
            region_code="NJ",
            source=ObservationSource.demo_seed,
            habitat_answers={"scenario": "well_sampled_park"},
        ),
        Observation(
            timestamp=datetime(2026, 6, 24, 12, tzinfo=UTC),
            latitude=Decimal("40.735000"),
            longitude=Decimal("-73.990000"),
            region_code="PA",
            source=ObservationSource.demo_seed,
            habitat_answers={"scenario": "under_sampled_survey"},
        ),
    ]
    session.add_all(observations)
    await session.flush()
    session.add_all(
        [
            AIIdentification(
                observation_id=observations[0].id,
                candidate_species_id=knotweed.id,
                candidate_scientific_name=knotweed.scientific_name,
                candidate_common_name=knotweed.common_name,
                confidence=Decimal("0.8600"),
                confidence_label=ConfidenceLabel.high,
                model_name="demo",
                model_version="0.1",
            ),
            AIIdentification(
                observation_id=observations[1].id,
                candidate_species_id=loosestrife.id,
                candidate_scientific_name=loosestrife.scientific_name,
                candidate_common_name=loosestrife.common_name,
                confidence=Decimal("0.6200"),
                confidence_label=ConfidenceLabel.medium,
                model_name="demo",
                model_version="0.1",
            ),
        ]
    )
    for observation in observations:
        session.add(
            EnvironmentalContext(
                observation_id=observation.id,
                land_cover_class="urban",
                distance_to_water_m=Decimal("80.00"),
                distance_to_road_m=Decimal("20.00"),
                data_sources={"demo_seed": "static"},
                enrichment_version="demo-0.1",
            )
        )
        session.add(Verification(observation_id=observation.id, status=VerificationStatus.raw))
        session.add(
            SignalScore(
                observation_id=observation.id,
                identity_confidence=Decimal("80.00"),
                local_novelty=Decimal("60.00"),
                habitat_match=Decimal("70.00"),
                pathway_risk=Decimal("75.00"),
                nearby_verified_record_context=Decimal("30.00"),
                ecological_sensitivity=Decimal("60.00"),
                sampling_gap_value=Decimal("80.00"),
                temporal_cluster_score=Decimal("10.00"),
                uncertainty_penalty=Decimal("5.00"),
                final_signal_priority=Decimal("67.00"),
                label=SignalScoreLabel.high_value_verification_candidate,
                reasons=[{"code": "demo_seed"}],
                model_version="demo-0.1",
            )
        )
    session.add_all(
        [
            SamplingGridCell(
                region_code="NY",
                geom="POLYGON((-74.02 40.70,-73.99 40.70,-73.99 40.73,-74.02 40.73,-74.02 40.70))",
                min_latitude=Decimal("40.700000"),
                min_longitude=Decimal("-74.020000"),
                max_latitude=Decimal("40.730000"),
                max_longitude=Decimal("-73.990000"),
                observation_count=2,
                verified_count=1,
                recent_observation_count=2,
                risk_context={"demo_seed": True},
                sampling_label=SamplingLabel.moderately_sampled,
            ),
            SamplingGridCell(
                region_code="PA",
                geom="POLYGON((-74.00 40.73,-73.98 40.73,-73.98 40.75,-74.00 40.75,-74.00 40.73))",
                min_latitude=Decimal("40.730000"),
                min_longitude=Decimal("-74.000000"),
                max_latitude=Decimal("40.750000"),
                max_longitude=Decimal("-73.980000"),
                observation_count=0,
                verified_count=0,
                recent_observation_count=0,
                risk_context={"demo_seed": True},
                sampling_label=SamplingLabel.needs_structured_survey,
            ),
        ]
    )
    await session.commit()
    return {"observations": len(observations), "sampling_grid_cells": 2}


async def _clear_demo_region(session: AsyncSession) -> None:
    observation_ids = (
        await session.execute(
            select(Observation.id).where(Observation.source == ObservationSource.demo_seed)
        )
    ).scalars().all()
    if observation_ids:
        await session.execute(
            delete(SignalScore).where(SignalScore.observation_id.in_(observation_ids))
        )
        await session.execute(
            delete(Verification).where(Verification.observation_id.in_(observation_ids))
        )
        await session.execute(
            delete(EnvironmentalContext).where(
                EnvironmentalContext.observation_id.in_(observation_ids)
            )
        )
        await session.execute(
            delete(AIIdentification).where(
                AIIdentification.observation_id.in_(observation_ids)
            )
        )
    await session.execute(
        delete(Observation).where(Observation.source == ObservationSource.demo_seed)
    )
    await session.execute(delete(KnownRecord).where(KnownRecord.source == "demo_seed"))
    await session.execute(delete(StaticWaterway).where(StaticWaterway.source == "demo_seed"))
    await session.execute(delete(StaticRoadTrail).where(StaticRoadTrail.source == "demo_seed"))
    await session.execute(delete(StaticPark).where(StaticPark.source == "demo_seed"))
    await session.execute(
        delete(SamplingGridCell).where(SamplingGridCell.risk_context["demo_seed"].as_boolean())
    )


async def main_async() -> None:
    async with AsyncSessionLocal() as session:
        created_count = await seed_species(session)
        await seed_demo_region(session)
    updated_count = len(MVP_SPECIES) - created_count
    print(f"Seeded MVP species. Created {created_count}, updated {updated_count}.")


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
