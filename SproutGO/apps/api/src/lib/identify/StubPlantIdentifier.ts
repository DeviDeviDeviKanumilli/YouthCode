// Deterministic, offline PlantIdentifier used whenever OPENAI_API_KEY is absent
// (local dev, CI, tests). Same image always yields the same result, so pipeline
// tests are stable. Confidence sits above MIN_AUTO_CREATE_CONFIDENCE so the
// auto-create branch is exercisable without live AI.

import type { IdResult, PlantIdentifier } from "./PlantIdentifier";

const SPECIES: ReadonlyArray<Omit<IdResult, "confidence">> = [
  { scientificName: "Acer rubrum", commonName: "Red Maple", family: "Sapindaceae" },
  { scientificName: "Quercus alba", commonName: "White Oak", family: "Fagaceae" },
  { scientificName: "Trifolium repens", commonName: "White Clover", family: "Fabaceae" },
  { scientificName: "Toxicodendron radicans", commonName: "Poison Ivy", family: "Anacardiaceae" },
  { scientificName: "Asclepias syriaca", commonName: "Common Milkweed", family: "Apocynaceae" },
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class StubPlantIdentifier implements PlantIdentifier {
  async identify(imageUrl: string): Promise<IdResult> {
    const h = hash(imageUrl);
    const species = SPECIES[h % SPECIES.length]!;
    // 0.88..0.97 — deterministically above the auto-create threshold.
    const confidence = 0.88 + (h % 10) / 100;
    return { ...species, confidence };
  }
}
