import { describe, it, expect } from "vitest";
import { assignRarity } from "./rarity";

// assignRarity is the deterministic seed-time heuristic (POINTS_AND_RARITY.md). Pin each branch
// so a balance change is intentional.

describe("assignRarity", () => {
  it("returns LEGENDARY for a hand-curated allowlisted species, regardless of breadth", () => {
    expect(
      assignRarity({ scientificName: "Cypripedium acaule", nativeStatus: "NATIVE", stateCount: 9 }),
    ).toBe("LEGENDARY");
  });

  it("forces INVASIVE species to COMMON (abundant by nature)", () => {
    expect(
      assignRarity({ scientificName: "Rosa multiflora", nativeStatus: "INVASIVE", stateCount: 1 }),
    ).toBe("COMMON");
  });

  it("is COMMON when recorded in >= 7 NE states", () => {
    expect(assignRarity({ scientificName: "Acer rubrum", nativeStatus: "NATIVE", stateCount: 9 })).toBe("COMMON");
    expect(assignRarity({ scientificName: "X y", nativeStatus: "NATIVE", stateCount: 7 })).toBe("COMMON");
  });

  it("is UNCOMMON in the 3..6 state range", () => {
    expect(assignRarity({ scientificName: "X y", nativeStatus: "NATIVE", stateCount: 6 })).toBe("UNCOMMON");
    expect(assignRarity({ scientificName: "X y", nativeStatus: "NATIVE", stateCount: 3 })).toBe("UNCOMMON");
  });

  it("is RARE for narrow distribution (< 3 states)", () => {
    expect(assignRarity({ scientificName: "X y", nativeStatus: "NATIVE", stateCount: 2 })).toBe("RARE");
    expect(assignRarity({ scientificName: "X y", nativeStatus: "UNKNOWN", stateCount: 0 })).toBe("RARE");
  });
});
