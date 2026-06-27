// Pure geo helpers for the map endpoint. Coordinate fuzzing protects rare/sensitive
// plant locations: non-owners receive coordinates snapped to a coarse grid, never the
// exact point (SECURITY_AND_PRIVACY §location, OPEN_QUESTIONS #8 — resolved-for-M2 at
// ~500m). Deterministic by design: the same input always snaps to the same cell, so the
// marker doesn't jitter as the map refetches.

import type { Rarity, NativeStatus } from "@sproutgo/shared";

// ~0.005° of latitude ≈ 500m. Longitude cells narrow toward the poles; acceptable for
// MVP privacy (the goal is "somewhere near here", not a precise radius).
export const FUZZ_GRID_DEGREES = 0.005;

export function snapToGrid(
  latitude: number,
  longitude: number,
): { latitude: number; longitude: number } {
  const snap = (n: number) =>
    Math.round(n / FUZZ_GRID_DEGREES) * FUZZ_GRID_DEGREES;
  // Round to kill floating-point dust (e.g. 0.30000000000000004 → 0.3).
  const clean = (n: number) => Number(n.toFixed(6));
  return { latitude: clean(snap(latitude)), longitude: clean(snap(longitude)) };
}

// Whether a plant's location should be fuzzed for non-owners. Rare/legendary species
// and invasives are sensitive — exact coordinates could enable poaching or trampling.
export function shouldFuzz(
  rarity: Rarity | null,
  nativeStatus: NativeStatus | null,
): boolean {
  return (
    rarity === "RARE" ||
    rarity === "LEGENDARY" ||
    nativeStatus === "INVASIVE"
  );
}
