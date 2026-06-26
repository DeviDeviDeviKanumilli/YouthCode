import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
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


async def main_async() -> None:
    async with AsyncSessionLocal() as session:
        created_count = await seed_species(session)
    updated_count = len(MVP_SPECIES) - created_count
    print(f"Seeded MVP species. Created {created_count}, updated {updated_count}.")


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
