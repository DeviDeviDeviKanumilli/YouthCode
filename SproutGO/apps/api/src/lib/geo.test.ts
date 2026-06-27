import { describe, it, expect } from "vitest";
import { FUZZ_GRID_DEGREES, snapToGrid, shouldFuzz } from "./geo";

// Pure geo helpers behind the map endpoint's rare-plant coordinate fuzzing
// (SECURITY_AND_PRIVACY §location). Fuzzing must be deterministic so markers
// don't jitter across map refetches — that determinism is what these tests pin.

describe("snapToGrid", () => {
  it("snaps a known point to the nearest 0.005 grid cell", () => {
    // 1.234 / 0.005 = 246.8 -> round 247 -> 1.235
    // -5.678 / 0.005 = -1135.6 -> round -1136 -> -5.68
    expect(snapToGrid(1.234, -5.678)).toEqual({ latitude: 1.235, longitude: -5.68 });
  });

  it("is idempotent: snapping an already-snapped value returns the same value", () => {
    const once = snapToGrid(40.7128, -74.006);
    const twice = snapToGrid(once.latitude, once.longitude);
    expect(twice).toEqual(once);
  });

  it("handles negative coordinates", () => {
    // -1.234 / 0.005 = -246.8 -> round -247 -> -1.235
    expect(snapToGrid(-1.234, -5.678)).toEqual({ latitude: -1.235, longitude: -5.68 });
  });

  it("always returns a multiple of FUZZ_GRID_DEGREES (no float dust)", () => {
    const { latitude, longitude } = snapToGrid(12.34167, -98.76543);
    // Dividing out the grid should leave a clean integer.
    expect(Number.isInteger(Math.round(latitude / FUZZ_GRID_DEGREES))).toBe(true);
    expect(latitude).toBe(Number(latitude.toFixed(6)));
    expect(longitude).toBe(Number(longitude.toFixed(6)));
  });
});

describe("shouldFuzz", () => {
  it("is true for RARE, LEGENDARY, and INVASIVE native status", () => {
    expect(shouldFuzz("RARE", null)).toBe(true);
    expect(shouldFuzz("LEGENDARY", null)).toBe(true);
    expect(shouldFuzz(null, "INVASIVE")).toBe(true);
    // A common plant that is also invasive still fuzzes (invasive wins).
    expect(shouldFuzz("COMMON", "INVASIVE")).toBe(true);
  });

  it("is false for COMMON, UNCOMMON, and null/null", () => {
    expect(shouldFuzz("COMMON", null)).toBe(false);
    expect(shouldFuzz("UNCOMMON", null)).toBe(false);
    expect(shouldFuzz(null, null)).toBe(false);
    expect(shouldFuzz("COMMON", "NATIVE")).toBe(false);
    expect(shouldFuzz("UNCOMMON", "INTRODUCED")).toBe(false);
  });
});
