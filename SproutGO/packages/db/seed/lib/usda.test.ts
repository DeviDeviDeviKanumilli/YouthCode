import { describe, it, expect } from "vitest";
import {
  stripScientificAuthor,
  genusOf,
  pickPrimaryCommonName,
  mapGrowthHabit,
  mapNativeStatus,
  isAcceptedName,
  countStates,
  parseUsdaCsv,
} from "./usda";
import { normalizeRows, capToTarget } from "./normalize";

describe("USDA column transforms", () => {
  it("strips the taxonomic author to genus + species", () => {
    expect(stripScientificAuthor("Acer rubrum L.")).toBe("Acer rubrum");
    expect(stripScientificAuthor("Quercus alba")).toBe("Quercus alba");
    expect(stripScientificAuthor("Symphyotrichum novae-angliae (L.) G.L.Nesom")).toBe(
      "Symphyotrichum novae-angliae",
    );
  });

  it("derives genus from the scientific name", () => {
    expect(genusOf("Acer rubrum")).toBe("Acer");
    expect(genusOf("")).toBeNull();
  });

  it("picks + title-cases the primary common name", () => {
    expect(pickPrimaryCommonName("red maple, swamp maple")).toBe("Red Maple");
    expect(pickPrimaryCommonName("")).toBeNull();
  });

  it("maps Growth Habit to PlantType", () => {
    expect(mapGrowthHabit("Tree")).toBe("TREE");
    expect(mapGrowthHabit("Shrub, Subshrub")).toBe("SHRUB");
    expect(mapGrowthHabit("Graminoid")).toBe("GRASS");
    expect(mapGrowthHabit("Forb/herb")).toBe("FLOWER");
    expect(mapGrowthHabit("Fern")).toBe("FERN");
    expect(mapGrowthHabit("Vine")).toBe("OTHER");
  });

  it("maps Native Status, with an invasive override", () => {
    expect(mapNativeStatus("L48 (N)")).toBe("NATIVE");
    expect(mapNativeStatus("L48 (I)")).toBe("INTRODUCED");
    expect(mapNativeStatus("")).toBe("UNKNOWN");
    expect(mapNativeStatus("L48 (N)", true)).toBe("INVASIVE");
  });

  it("treats only blank-synonym rows as accepted names", () => {
    expect(isAcceptedName({ synonymSymbol: "" })).toBe(true);
    expect(isAcceptedName({ synonymSymbol: "ACRU2" })).toBe(false);
  });

  it("counts region states present in a distribution string", () => {
    expect(countStates("NJ NY PA CA", ["NJ", "NY", "PA", "RI"])).toBe(3);
    expect(countStates("", ["NJ"])).toBe(0);
  });
});

const CSV = `Scientific Name with Author,Common Name,Family,Growth Habit,Native Status,Synonym Symbol,Accepted Symbol,State Distribution
Acer rubrum L.,"Red Maple, swamp maple",Sapindaceae,Tree,L48 (N),,ACRU,CT MA NJ NY PA RI VT NH ME
Acer rubrum var. trilobum,"red maple",Sapindaceae,Tree,L48 (N),ACRUT,ACRU,NJ
Trillium grandiflorum,White Trillium,Melanthiaceae,Forb/herb,L48 (N),,TRGR,NY PA CT
,No Name,,Tree,L48 (N),,XX,NJ`;

describe("parse + normalize", () => {
  it("parses CSV rows by header name", () => {
    const rows = parseUsdaCsv(CSV);
    expect(rows).toHaveLength(4);
    expect(rows[0]?.scientificName).toBe("Acer rubrum L.");
    expect(rows[0]?.family).toBe("Sapindaceae");
  });

  it("drops synonyms + nameless rows and dedups on scientificName", () => {
    const out = normalizeRows(parseUsdaCsv(CSV));
    // Acer rubrum (accepted) + Trillium grandiflorum; synonym row + blank-name row dropped.
    expect(out.map((p) => p.scientificName)).toEqual(["Acer rubrum", "Trillium grandiflorum"]);
    const acer = out[0]!;
    expect(acer.commonName).toBe("Red Maple");
    expect(acer.type).toBe("TREE");
    expect(acer.nativeStatus).toBe("NATIVE");
    expect(acer.rarity).toBe("COMMON"); // 9 NE states
    expect(out[1]!.rarity).toBe("UNCOMMON"); // 3 NE states
  });

  it("capToTarget prioritizes curated genera, then alphabetical, then slices", () => {
    const mk = (scientificName: string, genus: string) => ({
      scientificName,
      commonName: null,
      family: null,
      genus,
      type: "OTHER" as const,
      nativeStatus: "UNKNOWN" as const,
      rarity: "COMMON" as const,
      description: null,
      habitat: null,
      imageUrl: null,
      imageLicense: null,
      imageAttribution: null,
      imageSourceUrl: null,
    });
    const plants = [
      mk("Zebrina pendula", "Zebrina"),
      mk("Acer rubrum", "Acer"), // curated
      mk("Betula nigra", "Betula"), // curated
    ];
    const out = capToTarget(plants, 2, ["Acer", "Betula"]);
    expect(out.map((p) => p.scientificName)).toEqual(["Acer rubrum", "Betula nigra"]);
  });
});
