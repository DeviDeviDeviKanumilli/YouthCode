import { describe, it, expect } from "vitest";
import { parseIdentification, FAILED } from "./OpenAIPlantIdentifier";

// The model's raw output is untrusted: malformed JSON, schema mismatches, or empty
// species must degrade to FAILED (→ UNCERTAIN in the route), never a 500 or invented data.
describe("parseIdentification", () => {
  it("returns FAILED for null/empty content", () => {
    expect(parseIdentification(null)).toEqual(FAILED);
    expect(parseIdentification("")).toEqual(FAILED);
  });

  it("returns FAILED for malformed JSON (no throw)", () => {
    expect(parseIdentification("{ not json")).toEqual(FAILED);
  });

  it("returns FAILED when the schema doesn't match", () => {
    expect(parseIdentification(JSON.stringify({ foo: "bar" }))).toEqual(FAILED);
    expect(parseIdentification(JSON.stringify({ scientificName: "X", confidence: 2 }))).toEqual(FAILED);
  });

  it("returns FAILED for an empty scientificName", () => {
    expect(
      parseIdentification(JSON.stringify({ scientificName: "  ", commonName: null, family: null, confidence: 0.9 })),
    ).toEqual(FAILED);
  });

  it("parses a well-formed identification", () => {
    const raw = JSON.stringify({
      scientificName: "Acer rubrum",
      commonName: "Red Maple",
      family: "Sapindaceae",
      confidence: 0.92,
    });
    expect(parseIdentification(raw)).toEqual({
      scientificName: "Acer rubrum",
      commonName: "Red Maple",
      family: "Sapindaceae",
      confidence: 0.92,
    });
  });
});
