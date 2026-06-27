import { describe, it, expect } from "vitest";
import type { Plant } from "@sproutgo/shared";
import { NativeStatus, Rarity, PlantType, IdSource } from "@sproutgo/shared";
import { compareBy } from "@/lib/librarySort";

// compareBy powers GET /library's in-memory sort (the rarity-tier order Prisma's alphabetical
// enum sort can't express, plus name/recent). It sorts a serialized Plant[]; we feed minimal
// literals shaped like the wire type.

function plant(overrides: Partial<Plant>): Plant {
  return {
    id: "p",
    scientificName: "Zzz zzz",
    commonName: "Zed",
    family: null,
    genus: null,
    type: PlantType.OTHER,
    description: null,
    habitat: null,
    nativeStatus: NativeStatus.UNKNOWN,
    rarity: Rarity.COMMON,
    imageUrl: null,
    imageLicense: null,
    imageAttribution: null,
    imageSourceUrl: null,
    source: IdSource.SEED,
    confidence: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("compareBy", () => {
  it("sorts by name (case-insensitive, common name) by default", () => {
    const a = plant({ id: "a", commonName: "apple" });
    const b = plant({ id: "b", commonName: "Banana" });
    const c = plant({ id: "c", commonName: "cherry" });
    expect([c, a, b].sort(compareBy("name")).map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("falls back to scientificName when commonName is null", () => {
    const a = plant({ id: "a", commonName: null, scientificName: "Acer rubrum" });
    const z = plant({ id: "z", commonName: null, scientificName: "Zelkova serrata" });
    expect([z, a].sort(compareBy("name")).map((p) => p.id)).toEqual(["a", "z"]);
  });

  it("sorts by rarity rarest-first, name as tiebreak", () => {
    const common = plant({ id: "common", rarity: Rarity.COMMON, commonName: "a" });
    const uncommon = plant({ id: "uncommon", rarity: Rarity.UNCOMMON, commonName: "a" });
    const rare = plant({ id: "rare", rarity: Rarity.RARE, commonName: "a" });
    const legendary = plant({ id: "legendary", rarity: Rarity.LEGENDARY, commonName: "a" });
    expect([common, rare, legendary, uncommon].sort(compareBy("rarity")).map((p) => p.id)).toEqual([
      "legendary",
      "rare",
      "uncommon",
      "common",
    ]);
  });

  it("sorts by recent newest-first using ISO createdAt", () => {
    const old = plant({ id: "old", createdAt: "2026-01-01T00:00:00.000Z" });
    const mid = plant({ id: "mid", createdAt: "2026-03-01T00:00:00.000Z" });
    const recent = plant({ id: "recent", createdAt: "2026-05-01T00:00:00.000Z" });
    expect([old, recent, mid].sort(compareBy("recent")).map((p) => p.id)).toEqual([
      "recent",
      "mid",
      "old",
    ]);
  });
});
