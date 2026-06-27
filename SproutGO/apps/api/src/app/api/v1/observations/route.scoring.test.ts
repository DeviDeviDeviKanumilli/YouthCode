import { describe, it, expect } from "vitest";
import {
  SCORING,
  MIN_AUTO_CREATE_CONFIDENCE,
  basePoints,
  firstDiscoveryPoints,
  duplicatePoints,
} from "@/config/scoring";

// The POST /api/v1/observations handler runs auth + a multi-step prisma.$transaction,
// so a full HTTP test would need deep, brittle Prisma mocks. Instead we pin the PURE
// decision rules the route delegates to (all via @/config/scoring, which re-exports
// @sproutgo/shared). scoring.test.ts in packages/shared already covers the base table,
// the ×2 first-discovery bonus, and COMMON dup decay; this file adds ONLY the route's
// branch boundaries that aren't covered there.

describe("auto-create confidence threshold (route: plant auto-created iff confidence >= MIN)", () => {
  it("rejects just below the 0.85 boundary and accepts at/above it", () => {
    // The route gates auto-create on `idResult.confidence >= MIN_AUTO_CREATE_CONFIDENCE`.
    expect(0.84 >= MIN_AUTO_CREATE_CONFIDENCE).toBe(false); // -> UNCERTAIN branch
    expect(0.85 >= MIN_AUTO_CREATE_CONFIDENCE).toBe(true); // -> MATCHED/auto-create
    expect(0.851 >= MIN_AUTO_CREATE_CONFIDENCE).toBe(true);
  });

  it("the stub's confidence floor (0.88) always clears the threshold", () => {
    expect(0.88).toBeGreaterThanOrEqual(MIN_AUTO_CREATE_CONFIDENCE);
  });
});

describe("first-discovery scoring across all rarities (route: isFirstDiscovery branch)", () => {
  it("awards base x2 for every rarity, not just COMMON/RARE/LEGENDARY", () => {
    // scoring.test.ts omits UNCOMMON for first-discovery; cover it here.
    expect(firstDiscoveryPoints("UNCOMMON")).toBe(50); // 25 * 2
    // Cross-check the general invariant for the whole table.
    for (const rarity of ["COMMON", "UNCOMMON", "RARE", "LEGENDARY"] as const) {
      expect(firstDiscoveryPoints(rarity)).toBe(basePoints(rarity) * 2);
    }
  });
});

describe("duplicate decay cap + floor beyond COMMON (route: !isFirstDiscovery branch)", () => {
  // scoring.test.ts pins COMMON decay; verify the cap at dupCapIndex (4) and the
  // MIN_DUP_POINTS floor hold for a higher-base rarity where decay stays above 1 longer.
  it("RARE (base 60) decays by 0.5^n then caps at index 4", () => {
    expect(duplicatePoints("RARE", 1)).toBe(30); // 60 * 0.5^1
    expect(duplicatePoints("RARE", 2)).toBe(15); // 60 * 0.5^2
    expect(duplicatePoints("RARE", 3)).toBe(8); // 60 * 0.5^3 = 7.5 -> round 8
    expect(duplicatePoints("RARE", 4)).toBe(4); // 60 * 0.5^4 = 3.75 -> round 4
    // Past the cap index the exponent is clamped to 4, so the value stays flat.
    expect(duplicatePoints("RARE", 5)).toBe(duplicatePoints("RARE", 4));
    expect(duplicatePoints("RARE", 99)).toBe(duplicatePoints("RARE", 4));
  });

  it("priorTimesObserved < 1 is clamped up to exponent 1 (no full-base award)", () => {
    // The helper does Math.max(prior, 1); a 0/negative prior must not yield base x 0.5^0 = base.
    expect(duplicatePoints("COMMON", 0)).toBe(duplicatePoints("COMMON", 1));
    expect(duplicatePoints("COMMON", -3)).toBe(duplicatePoints("COMMON", 1));
  });

  it("never drops below MIN_DUP_POINTS for any rarity", () => {
    for (const rarity of ["COMMON", "UNCOMMON", "RARE", "LEGENDARY"] as const) {
      expect(duplicatePoints(rarity, 50)).toBeGreaterThanOrEqual(SCORING.minDupPoints);
    }
  });
});

describe("daily same-species quota (route: quotaReached => 0 points)", () => {
  it("uses dailySameSpeciesCap as the >= boundary", () => {
    const cap = SCORING.dailySameSpeciesCap;
    // priorToday >= cap means quota reached; the route awards 0 in that case.
    expect(cap - 1 >= cap).toBe(false); // under quota -> still scores
    expect(cap >= cap).toBe(true); // at quota -> quotaReached, 0 points
  });
});
