import { describe, it, expect } from "vitest";
import {
  SCORING,
  MIN_AUTO_CREATE_CONFIDENCE,
  basePoints,
  firstDiscoveryPoints,
  duplicatePoints,
} from "./scoring";

// These tests PIN the formulas from POINTS_AND_RARITY.md so balance changes are
// deliberate (TESTING.md §unit). Update both the doc and these expectations together.

describe("base points by rarity", () => {
  it("matches the documented table", () => {
    expect(basePoints("COMMON")).toBe(10);
    expect(basePoints("UNCOMMON")).toBe(25);
    expect(basePoints("RARE")).toBe(60);
    expect(basePoints("LEGENDARY")).toBe(150);
  });
});

describe("first-discovery bonus (×2.0)", () => {
  it("doubles base points", () => {
    expect(firstDiscoveryPoints("COMMON")).toBe(20);
    expect(firstDiscoveryPoints("RARE")).toBe(120); // doc's worked example
    expect(firstDiscoveryPoints("LEGENDARY")).toBe(300);
  });
});

describe("duplicate diminishing returns (COMMON, base 10)", () => {
  // Doc example: 2nd → 5, 3rd → 3, 4th → 1, 5th+ → 1
  it("decays then floors", () => {
    expect(duplicatePoints("COMMON", 1)).toBe(5); // 10 * 0.5^1
    expect(duplicatePoints("COMMON", 2)).toBe(3); // 10 * 0.5^2 = 2.5 → round 3
    expect(duplicatePoints("COMMON", 3)).toBe(1); // 10 * 0.5^3 = 1.25 → round 1
    expect(duplicatePoints("COMMON", 4)).toBe(1); // 10 * 0.5^4 = 0.625 → 1 (floor)
    expect(duplicatePoints("COMMON", 99)).toBe(1); // capped past index 4, floored
  });

  it("never awards below MIN_DUP_POINTS", () => {
    expect(duplicatePoints("COMMON", 10)).toBeGreaterThanOrEqual(SCORING.minDupPoints);
  });
});

describe("config + thresholds", () => {
  it("exposes the documented constants", () => {
    expect(SCORING.firstDiscoveryMultiplier).toBe(2.0);
    expect(SCORING.dupFactor).toBe(0.5);
    expect(SCORING.dupCapIndex).toBe(4);
    expect(SCORING.dailySameSpeciesCap).toBe(5);
    expect(MIN_AUTO_CREATE_CONFIDENCE).toBe(0.85);
  });

  it("defines sane capture rate-limit caps", () => {
    expect(SCORING.captureWindowSeconds).toBeGreaterThan(0);
    expect(SCORING.captureWindowMax).toBeGreaterThan(0);
    expect(SCORING.idempotencyWindowSeconds).toBeGreaterThan(0);
    // A day's total cap must allow at least one full burst window.
    expect(SCORING.dailyCaptureCap).toBeGreaterThanOrEqual(SCORING.captureWindowMax);
  });
});
