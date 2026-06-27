import { describe, it, expect } from "vitest";
import { buildPersona, buildSystemPrompt, type PlantFacts } from "./persona";

describe("buildPersona", () => {
  it("maps each rarity to a distinct voice", () => {
    expect(buildPersona("COMMON", "NATIVE", "TREE")).toContain("friendly");
    expect(buildPersona("UNCOMMON", "NATIVE", "TREE")).toContain("proud");
    expect(buildPersona("RARE", "NATIVE", "TREE")).toContain("mysterious");
    expect(buildPersona("LEGENDARY", "NATIVE", "TREE")).toContain("ancient");
  });

  it("INVASIVE overrides rarity with a brash voice", () => {
    expect(buildPersona("LEGENDARY", "INVASIVE", "TREE")).toContain("brash");
    expect(buildPersona("COMMON", "INVASIVE", "SHRUB")).toContain("brash");
  });

  it("FLOWER adds a gentle flavor on top of the base voice", () => {
    const p = buildPersona("COMMON", "NATIVE", "FLOWER");
    expect(p).toContain("friendly");
    expect(p).toContain("delicate");
  });
});

const PLANT: PlantFacts = {
  commonName: "Red Maple",
  scientificName: "Acer rubrum",
  family: "Sapindaceae",
  type: "TREE",
  nativeStatus: "NATIVE",
  rarity: "COMMON",
  habitat: "swamps and uplands",
  description: "A widespread eastern tree with red autumn leaves.",
};

describe("buildSystemPrompt", () => {
  it("speaks as the plant in first person and injects the facts", () => {
    const prompt = buildSystemPrompt(PLANT);
    expect(prompt).toContain("Red Maple (Acer rubrum)");
    expect(prompt).toContain("first person");
    expect(prompt).toContain("Sapindaceae");
    expect(prompt).toContain("swamps and uplands");
    expect(prompt).toContain("Never invent");
  });

  it("omits null facts and falls back to scientific name", () => {
    const prompt = buildSystemPrompt({
      ...PLANT,
      commonName: null,
      family: null,
      habitat: null,
      description: null,
    });
    expect(prompt).toContain("Acer rubrum (Acer rubrum)");
    expect(prompt).not.toContain("family:");
    expect(prompt).not.toContain("habitat:");
  });
});
