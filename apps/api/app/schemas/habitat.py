from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, TypeAdapter


class YesNoUnknown(StrEnum):
    yes = "yes"
    no = "no"
    unknown = "unknown"


class HabitatOrganismType(StrEnum):
    plant = "plant"
    insect = "insect"
    aquatic = "aquatic"
    unknown = "unknown"


class PlantGrowthPattern(StrEnum):
    alone = "alone"
    patch = "patch"
    unknown = "unknown"


class PlantHabitatType(StrEnum):
    garden = "garden"
    park = "park"
    forest = "forest"
    vacant_lot = "vacant_lot"
    roadside = "roadside"
    wetland = "wetland"
    unknown = "unknown"


class InsectSubstrate(StrEnum):
    tree = "tree"
    plant = "plant"
    building = "building"
    ground = "ground"
    unknown = "unknown"


class InsectAbundance(StrEnum):
    one = "one"
    few = "few"
    many = "many"
    unknown = "unknown"


class InsectBehavior(StrEnum):
    flying = "flying"
    crawling = "crawling"
    attached = "attached"
    dead = "dead"
    unknown = "unknown"


class WaterBodyType(StrEnum):
    pond = "pond"
    stream = "stream"
    river = "river"
    lake = "lake"
    wetland = "wetland"
    unknown = "unknown"


class AquaticOrganismPosition(StrEnum):
    floating = "floating"
    rooted = "rooted"
    swimming = "swimming"
    attached = "attached"
    unknown = "unknown"


class WaterFlow(StrEnum):
    slow = "slow"
    fast = "fast"
    still = "still"
    unknown = "unknown"


class HabitatBase(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PlantHabitatAnswers(HabitatBase):
    organism_type: Literal[HabitatOrganismType.plant]
    growth_pattern: PlantGrowthPattern = PlantGrowthPattern.unknown
    near_water: YesNoUnknown = YesNoUnknown.unknown
    near_road_or_trail: YesNoUnknown = YesNoUnknown.unknown
    habitat_type: PlantHabitatType = PlantHabitatType.unknown


class InsectHabitatAnswers(HabitatBase):
    organism_type: Literal[HabitatOrganismType.insect]
    substrate: InsectSubstrate = InsectSubstrate.unknown
    abundance: InsectAbundance = InsectAbundance.unknown
    behavior: InsectBehavior = InsectBehavior.unknown
    plant_damage_nearby: YesNoUnknown = YesNoUnknown.unknown


class AquaticHabitatAnswers(HabitatBase):
    organism_type: Literal[HabitatOrganismType.aquatic]
    water_body_type: WaterBodyType = WaterBodyType.unknown
    organism_position: AquaticOrganismPosition = AquaticOrganismPosition.unknown
    water_flow: WaterFlow = WaterFlow.unknown


class UnknownHabitatAnswers(HabitatBase):
    organism_type: Literal[HabitatOrganismType.unknown]


HabitatAnswers = (
    PlantHabitatAnswers | InsectHabitatAnswers | AquaticHabitatAnswers | UnknownHabitatAnswers
)
habitat_adapter: TypeAdapter[HabitatAnswers] = TypeAdapter(HabitatAnswers)


def validate_habitat_answers(value: dict[str, Any] | None) -> dict[str, Any]:
    if not value:
        return {}
    if "organism_type" not in value:
        return value
    validated = habitat_adapter.validate_python(value)
    return validated.model_dump(mode="json")
