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
    SpeciesWatchProfile,
    StaticPark,
    StaticRoadTrail,
    StaticWaterway,
    Verification,
    VerificationStatus,
    WatchAssetImage,
    WatchResponseCache,
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


async def seed_watch_data(session: AsyncSession) -> dict[str, int]:
    await seed_species(session)
    species_repository = SpeciesRepository(session)
    species_by_name = {
        item.scientific_name: await species_repository.get_by_scientific_name(item.scientific_name)
        for item in MVP_SPECIES
    }
    missing = [name for name, species in species_by_name.items() if species is None]
    if missing:
        raise RuntimeError(f"MVP species were not seeded: {', '.join(missing)}")

    await session.execute(delete(WatchResponseCache))
    await session.execute(delete(WatchAssetImage))
    await session.execute(delete(SpeciesWatchProfile))
    now = datetime.now(UTC)
    profile_specs = [
        (
            "Lycorma delicatula",
            "Seasonal watch",
            "Recently reported nearby in some areas. Look for adults, egg masses, or nymphs.",
            [6, 7, 8, 9, 10],
            ["tree", "park", "edge"],
            ["road", "trail"],
            ["Adults on trees or posts", "Egg masses on outdoor surfaces", "Nymph clusters"],
            ["Photograph the whole insect or egg mass", "Include the tree or surface nearby"],
            ["Some native planthoppers can look similar."],
            Decimal("58.00"),
            True,
            True,
            False,
            False,
        ),
        (
            "Fallopia japonica",
            "Worth checking near water",
            "Worth checking near water. Look for dense patches along creek edges.",
            [5, 6, 7, 8, 9, 10],
            ["water", "creek", "edge"],
            ["road", "trail", "soil"],
            ["Bamboo-like stems", "Broad leaves", "Dense creek-edge patches"],
            ["Photograph stems, leaves, and the patch edge", "Include creek or path context"],
            ["Some ornamental knotweeds may look similar."],
            Decimal("56.00"),
            True,
            True,
            False,
            False,
        ),
        (
            "Agrilus planipennis",
            "Tree health watch",
            "Watch ash trees for bark splitting, canopy thinning, or small exit holes.",
            [5, 6, 7, 8, 9],
            ["tree", "park", "street trees"],
            ["road", "edge"],
            ["D-shaped exit holes", "Bark splitting", "Canopy thinning"],
            ["Photograph bark details and the whole tree", "Do not remove bark or branches"],
            ["Other tree stress can cause similar canopy symptoms."],
            Decimal("55.00"),
            True,
            True,
            True,
            False,
        ),
        (
            "Trapa natans",
            "Aquatic watch",
            (
                "Worth checking slow water for floating rosettes if you are already near "
                "public access."
            ),
            [6, 7, 8, 9],
            ["water", "aquatic", "wetland"],
            ["water"],
            ["Floating rosettes", "Triangular toothed leaves", "Dense surface mats"],
            ["Photograph from shore or public access", "Show the floating leaf pattern"],
            ["Other floating aquatic plants may look similar."],
            Decimal("52.00"),
            True,
            True,
            False,
            True,
        ),
        (
            "Lythrum salicaria",
            "Wetland watch",
            "Look for purple flower spikes near wetlands, ditches, and streambanks.",
            [6, 7, 8, 9],
            ["water", "wetland", "creek"],
            ["water", "trail"],
            ["Purple flower spikes", "Square stems", "Wetland edge patches"],
            ["Photograph flowers, leaves, and surrounding wetland context"],
            ["Native wetland flowers can have similar colors."],
            Decimal("53.00"),
            True,
            True,
            False,
            False,
        ),
    ]
    profiles: list[SpeciesWatchProfile] = []
    assets: list[WatchAssetImage] = []
    for spec in profile_specs:
        (
            scientific_name,
            watch_label,
            public_summary,
            active_months,
            habitat_tags,
            pathway_tags,
            visual_clues,
            photo_tips,
            lookalike_notes,
            priority_base,
            is_invasive_concern,
            is_seasonal,
            is_tree_pest,
            is_aquatic,
        ) = spec
        species = species_by_name[scientific_name]
        assert species is not None
        profile = SpeciesWatchProfile(
            species_id=species.id,
            watch_label=watch_label,
            public_summary=public_summary,
            active_months=active_months,
            habitat_tags=habitat_tags,
            pathway_tags=pathway_tags,
            visual_clues=visual_clues,
            photo_tips=photo_tips,
            lookalike_notes=lookalike_notes,
            priority_base=priority_base,
            is_invasive_concern=is_invasive_concern,
            is_seasonal=is_seasonal,
            is_tree_pest=is_tree_pest,
            is_aquatic=is_aquatic,
        )
        profiles.append(profile)
        assets.append(
            WatchAssetImage(
                entity_type="species",
                entity_id=species.id,
                image_url=(
                    "https://storage.example.com/species/"
                    f"{scientific_name.lower().replace(' ', '-')}.jpg"
                ),
                alt_text=f"{species.common_name or species.scientific_name} reference image",
                created_at=now,
            )
        )
    for place_type, title in [
        ("creek_edges", "Creek edges"),
        ("trail_entrances", "Trail entrances"),
        ("park_boundaries", "Park boundaries"),
        ("street_trees", "Street trees"),
    ]:
        assets.append(
            WatchAssetImage(
                entity_type="place",
                place_type=place_type,
                image_url=f"https://storage.example.com/places/{place_type}.jpg",
                alt_text=f"{title} watch place image",
                created_at=now,
            )
        )
    session.add_all([*profiles, *assets])
    await session.commit()
    return {"species_watch_profiles": len(profiles), "watch_asset_images": len(assets)}


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
                confidence=Decimal("0.8200"),
                confidence_label=ConfidenceLabel.medium_high,
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
    score_definitions = [
        (
            Decimal("82.00"),
            SignalScoreLabel.high_value_verification_candidate,
            Decimal("67.00"),
        ),
        (
            Decimal("62.00"),
            SignalScoreLabel.moderate_signal,
            Decimal("42.00"),
        ),
        (
            Decimal("80.00"),
            SignalScoreLabel.high_value_verification_candidate,
            Decimal("71.00"),
        ),
    ]
    for observation, score_definition in zip(observations, score_definitions, strict=True):
        sampling_gap_value, label, final_signal_priority = score_definition
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
                sampling_gap_value=sampling_gap_value,
                temporal_cluster_score=Decimal("10.00"),
                uncertainty_penalty=Decimal("5.00"),
                final_signal_priority=final_signal_priority,
                label=label,
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
                region_code="NJ",
                geom="POLYGON((-74.01 40.71,-73.99 40.71,-73.99 40.73,-74.01 40.73,-74.01 40.71))",
                min_latitude=Decimal("40.710000"),
                min_longitude=Decimal("-74.010000"),
                max_latitude=Decimal("40.730000"),
                max_longitude=Decimal("-73.990000"),
                observation_count=8,
                verified_count=3,
                recent_observation_count=1,
                distance_to_park_m=Decimal("30.00"),
                risk_context={"demo_seed": True},
                sampling_label=SamplingLabel.well_sampled,
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
    return {"observations": len(observations), "sampling_grid_cells": 3}


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
        watch_counts = await seed_watch_data(session)
        await seed_demo_region(session)
    updated_count = len(MVP_SPECIES) - created_count
    print(
        "Seeded MVP species and Watch data. "
        f"Created {created_count}, updated {updated_count}, "
        f"watch_profiles={watch_counts['species_watch_profiles']}, "
        f"watch_assets={watch_counts['watch_asset_images']}."
    )


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
