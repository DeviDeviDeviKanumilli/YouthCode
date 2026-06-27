// Pure loader helpers — used by seed.ts (db:seed) and unit-tested without a DB. Kept separate
// from seed.ts because that file runs main() on import.

import { SEED_FILE_VERSION, type NormalizedPlant, type NormalizedSeedFile } from "./types";

// The Plant fields the seed sets, shaped to satisfy Prisma's PlantCreateManyInput at the call
// site (string enum values are valid for the generated enum types). source is always SEED.
export interface PlantCreateInput {
  scientificName: string;
  commonName: string | null;
  family: string | null;
  genus: string | null;
  type: NormalizedPlant["type"];
  nativeStatus: NormalizedPlant["nativeStatus"];
  rarity: NormalizedPlant["rarity"];
  description: string | null;
  habitat: string | null;
  imageUrl: string | null;
  imageLicense: string | null;
  imageAttribution: string | null;
  imageSourceUrl: string | null;
  source: "SEED";
}

export function toPlantCreateInput(p: NormalizedPlant): PlantCreateInput {
  return {
    scientificName: p.scientificName,
    commonName: p.commonName,
    family: p.family,
    genus: p.genus,
    type: p.type,
    nativeStatus: p.nativeStatus,
    rarity: p.rarity,
    description: p.description,
    habitat: p.habitat,
    imageUrl: p.imageUrl,
    imageLicense: p.imageLicense,
    imageAttribution: p.imageAttribution,
    imageSourceUrl: p.imageSourceUrl,
    source: "SEED",
  };
}

// Validate a parsed seed file: supported version, count matches the array. Throws on mismatch
// so the loader fails loudly rather than inserting a partial/garbled dataset.
export function assertValidSeedFile(file: NormalizedSeedFile): void {
  if (file.version !== SEED_FILE_VERSION) {
    throw new Error(
      `Seed file version ${file.version} is not supported (expected ${SEED_FILE_VERSION}).`,
    );
  }
  if (file.count !== file.plants.length) {
    throw new Error(
      `Seed file count (${file.count}) does not match plants array length (${file.plants.length}).`,
    );
  }
}
