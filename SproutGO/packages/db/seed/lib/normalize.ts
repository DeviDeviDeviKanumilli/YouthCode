// Turn parsed USDA rows into normalized, deduped, rarity-assigned Library species (no images
// yet — scrape.ts resolves those). Pure + unit-tested. Encodes the synonym collapse and the
// curated-genus cap so the seed is deterministic and reproducible.

import {
  type UsdaRow,
  isAcceptedName,
  stripScientificAuthor,
  genusOf,
  pickPrimaryCommonName,
  mapGrowthHabit,
  mapNativeStatus,
  countStates,
} from "./usda";
import { assignRarity } from "./rarity";
import { NE_STATES, CURATED_GENERA, SEED_TARGET_COUNT } from "./regions";
import type { NormalizedPlant } from "./types";

// Collapse synonyms → accepted names, map columns, assign rarity. Dedup on scientificName
// (the schema's unique key). Image fields are null here; scrape.ts fills them.
export function normalizeRows(
  rows: UsdaRow[],
  opts: { invasive?: Set<string>; regionStates?: readonly string[] } = {},
): NormalizedPlant[] {
  const invasive = opts.invasive ?? new Set<string>();
  const regionStates = opts.regionStates ?? NE_STATES;
  const seen = new Set<string>();
  const out: NormalizedPlant[] = [];

  for (const row of rows) {
    if (!isAcceptedName(row)) continue;
    const scientificName = stripScientificAuthor(row.scientificName);
    if (!scientificName || seen.has(scientificName)) continue;
    seen.add(scientificName);

    const nativeStatus = mapNativeStatus(row.nativeStatus, invasive.has(scientificName));
    const stateCount = countStates(row.stateDistribution, regionStates);

    out.push({
      scientificName,
      commonName: pickPrimaryCommonName(row.commonName),
      family: row.family.trim() || null,
      genus: genusOf(scientificName),
      type: mapGrowthHabit(row.growthHabit),
      nativeStatus,
      rarity: assignRarity({ scientificName, nativeStatus, stateCount }),
      description: null,
      habitat: null,
      imageUrl: null,
      imageLicense: null,
      imageAttribution: null,
      imageSourceUrl: null,
    });
  }
  return out;
}

// Cap to SEED_TARGET_COUNT: curated genera first, then alphabetical by scientificName, then
// slice. Deterministic — same input always yields the same N species.
export function capToTarget(
  plants: NormalizedPlant[],
  target = SEED_TARGET_COUNT,
  curatedGenera: readonly string[] = CURATED_GENERA,
): NormalizedPlant[] {
  const curated = new Set(curatedGenera);
  const ranked = [...plants].sort((a, b) => {
    const aCurated = a.genus && curated.has(a.genus) ? 0 : 1;
    const bCurated = b.genus && curated.has(b.genus) ? 0 : 1;
    if (aCurated !== bCurated) return aCurated - bCurated;
    return a.scientificName.localeCompare(b.scientificName);
  });
  return ranked.slice(0, target);
}
