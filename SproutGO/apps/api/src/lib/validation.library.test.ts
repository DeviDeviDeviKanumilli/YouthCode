import { describe, it, expect } from "vitest";
import {
  parseLibraryQuery,
  LIBRARY_PAGE_DEFAULT,
  LIBRARY_PAGE_MAX,
} from "./validation";

// parseLibraryQuery turns the GET /library URLSearchParams into a validated query, or null
// on any invalid value so the route can 400 (API_CONTRACT §library). Blank params are
// dropped (treated as absent) and defaults are applied. It must never throw.

function params(obj: Record<string, string>): URLSearchParams {
  return new URLSearchParams(obj);
}

describe("parseLibraryQuery", () => {
  it("applies defaults for an empty query", () => {
    expect(parseLibraryQuery(params({}))).toEqual({
      sort: "name",
      limit: LIBRARY_PAGE_DEFAULT,
      offset: 0,
    });
  });

  it("parses all facets, sort, and pagination", () => {
    expect(
      parseLibraryQuery(
        params({ q: "oak", type: "TREE", rarity: "RARE", native: "NATIVE", sort: "rarity", limit: "10", offset: "20" }),
      ),
    ).toEqual({
      q: "oak",
      type: "TREE",
      rarity: "RARE",
      native: "NATIVE",
      sort: "rarity",
      limit: 10,
      offset: 20,
    });
  });

  it("drops blank params instead of failing the enum (e.g. ?type=)", () => {
    expect(parseLibraryQuery(params({ type: "", q: "  " }))).toEqual({
      sort: "name",
      limit: LIBRARY_PAGE_DEFAULT,
      offset: 0,
    });
  });

  it("coerces numeric strings and trims q", () => {
    const out = parseLibraryQuery(params({ q: "  maple  ", limit: "5" }));
    expect(out?.q).toBe("maple");
    expect(out?.limit).toBe(5);
  });

  it("returns null for an invalid enum value", () => {
    expect(parseLibraryQuery(params({ type: "BUSH" }))).toBeNull();
    expect(parseLibraryQuery(params({ rarity: "MYTHIC" }))).toBeNull();
    expect(parseLibraryQuery(params({ sort: "color" }))).toBeNull();
  });

  it("returns null when limit exceeds the max or is non-positive", () => {
    expect(parseLibraryQuery(params({ limit: String(LIBRARY_PAGE_MAX + 1) }))).toBeNull();
    expect(parseLibraryQuery(params({ limit: "0" }))).toBeNull();
  });

  it("returns null for a negative offset", () => {
    expect(parseLibraryQuery(params({ offset: "-1" }))).toBeNull();
  });

  it("returns null for a non-integer limit", () => {
    expect(parseLibraryQuery(params({ limit: "3.5" }))).toBeNull();
  });
});
