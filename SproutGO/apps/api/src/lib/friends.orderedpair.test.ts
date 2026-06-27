import { describe, it, expect } from "vitest";
import { orderedPair } from "./friends";

// Friendship rows are canonical: userAId < userBId. orderedPair must normalize either input
// ordering to the same pair so create/lookup/delete always hit one row.
describe("orderedPair", () => {
  it("orders the two ids the same way regardless of argument order", () => {
    const a = orderedPair("aaa", "bbb");
    const b = orderedPair("bbb", "aaa");
    expect(a).toEqual({ userAId: "aaa", userBId: "bbb" });
    expect(b).toEqual({ userAId: "aaa", userBId: "bbb" });
    expect(a).toEqual(b);
  });
});
