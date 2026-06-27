// Shared shapes for the Library seed pipeline (LIBRARY_SEED.md). These enum unions mirror the
// Prisma enums (packages/db/prisma/schema.prisma) and packages/shared/src/enums.ts — kept as
// plain string unions here so the seed has no dependency beyond Prisma. The loader passes
// these strings straight into prisma.plant.createMany, where they satisfy the generated enum
// types.

export type PlantType = "TREE" | "FLOWER" | "SHRUB" | "FERN" | "GRASS" | "OTHER";
export type NativeStatus = "NATIVE" | "INTRODUCED" | "INVASIVE" | "UNKNOWN";
export type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY";

// One fully-normalized Library species, ready to insert. `source` is always "SEED" at load
// time; rarity is assigned by the heuristic; image fields are null when no CC/PD image resolved.
export interface NormalizedPlant {
  scientificName: string;
  commonName: string | null;
  family: string | null;
  genus: string | null;
  type: PlantType;
  nativeStatus: NativeStatus;
  rarity: Rarity;
  description: string | null;
  habitat: string | null;
  imageUrl: string | null;
  imageLicense: string | null;
  imageAttribution: string | null;
  imageSourceUrl: string | null;
}

// The committed artifact the offline loader (db:seed) reads. Versioned so the loader can
// reject a file it doesn't understand.
export interface NormalizedSeedFile {
  version: 1;
  generatedAt: string;
  sourceQuery: string;
  count: number;
  plants: NormalizedPlant[];
}

export const SEED_FILE_VERSION = 1 as const;
