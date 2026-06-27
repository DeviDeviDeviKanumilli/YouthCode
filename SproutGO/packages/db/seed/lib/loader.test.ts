import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { assertValidSeedFile, toPlantCreateInput } from "./loader";
import type { NormalizedSeedFile } from "./types";

const committed = JSON.parse(
  readFileSync(fileURLToPath(new URL("../plants.normalized.json", import.meta.url)), "utf8"),
) as NormalizedSeedFile;

const RARITIES = ["COMMON", "UNCOMMON", "RARE", "LEGENDARY"];
const TYPES = ["TREE", "FLOWER", "SHRUB", "FERN", "GRASS", "OTHER"];
const NATIVE = ["NATIVE", "INTRODUCED", "INVASIVE", "UNKNOWN"];

describe("committed plants.normalized.json", () => {
  it("is a valid, self-consistent seed file", () => {
    expect(() => assertValidSeedFile(committed)).not.toThrow();
    expect(committed.plants.length).toBe(committed.count);
  });

  it("has unique scientific names (the dedup/unique key)", () => {
    const names = committed.plants.map((p) => p.scientificName);
    expect(new Set(names).size).toBe(names.length);
  });

  it("uses only valid enum values", () => {
    for (const p of committed.plants) {
      expect(RARITIES, p.scientificName).toContain(p.rarity);
      expect(TYPES, p.scientificName).toContain(p.type);
      expect(NATIVE, p.scientificName).toContain(p.nativeStatus);
    }
  });

  it("never embeds an image without a license (CC attribution integrity)", () => {
    for (const p of committed.plants) {
      if (p.imageUrl != null) {
        expect(p.imageLicense, p.scientificName).not.toBeNull();
      }
    }
  });
});

describe("toPlantCreateInput", () => {
  it("maps a normalized plant and stamps source=SEED", () => {
    const input = toPlantCreateInput(committed.plants[0]!);
    expect(input.source).toBe("SEED");
    expect(input.scientificName).toBe(committed.plants[0]!.scientificName);
  });
});

describe("assertValidSeedFile", () => {
  it("throws on a count mismatch", () => {
    expect(() => assertValidSeedFile({ ...committed, count: committed.count + 1 })).toThrow();
  });

  it("throws on an unsupported version", () => {
    expect(() =>
      assertValidSeedFile({ ...committed, version: 999 as unknown as 1 }),
    ).toThrow();
  });
});
