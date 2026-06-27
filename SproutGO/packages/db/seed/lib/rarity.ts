// Deterministic seed-time rarity heuristic (POINTS_AND_RARITY.md, LIBRARY_SEED.md). Pure +
// unit-tested. No reliable per-species rarity exists in USDA, so we approximate from
// distribution breadth: broadly-recorded species are common, narrow ones are rare, with a
// hand-curated LEGENDARY allowlist and invasives forced common (they're abundant by nature).

import type { NativeStatus, Rarity } from "./types";
import {
  LEGENDARY_SPECIES,
  RARITY_COMMON_MIN_STATES,
  RARITY_UNCOMMON_MIN_STATES,
} from "./regions";

export function assignRarity(input: {
  scientificName: string;
  nativeStatus: NativeStatus;
  stateCount: number; // # of NE states the taxon is recorded in
}): Rarity {
  if (LEGENDARY_SPECIES.has(input.scientificName)) return "LEGENDARY";
  if (input.nativeStatus === "INVASIVE") return "COMMON";
  if (input.stateCount >= RARITY_COMMON_MIN_STATES) return "COMMON";
  if (input.stateCount >= RARITY_UNCOMMON_MIN_STATES) return "UNCOMMON";
  return "RARE";
}
