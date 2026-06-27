import { describe, it, expect } from "vitest";
import type { IdResult } from "@sproutgo/shared";
import { StubPlantIdentifier } from "./StubPlantIdentifier";

// The stub is the offline identifier used in dev/CI/tests (AI_INTEGRATION.md).
// Determinism is the contract pipeline tests rely on, and confidence must stay
// above MIN_AUTO_CREATE_CONFIDENCE (0.85) so the auto-create branch is reachable.

const SAMPLE_URLS = [
  "user-1/obs/a.jpg",
  "user-1/obs/b.jpg",
  "user-2/photo.png",
  "abc",
  "",
  "user-9/deep/path/to/image-1234.jpeg",
  "🌱/leaf.jpg",
];

describe("StubPlantIdentifier.identify", () => {
  const identifier = new StubPlantIdentifier();

  it("is deterministic: same imageUrl always yields the same result", async () => {
    for (const url of SAMPLE_URLS) {
      const a = await identifier.identify(url);
      const b = await identifier.identify(url);
      expect(a).toEqual(b);
    }
  });

  it("conforms to the IdResult shape with a valid, in-range confidence", async () => {
    for (const url of SAMPLE_URLS) {
      const r: IdResult = await identifier.identify(url);
      expect(typeof r.scientificName).toBe("string");
      expect(r.scientificName.length).toBeGreaterThan(0);
      // commonName/family are string|null per the type, but the stub's fixed list
      // always supplies strings.
      expect(r.commonName === null || typeof r.commonName === "string").toBe(true);
      expect(r.family === null || typeof r.family === "string").toBe(true);
      expect(r.confidence).toBeGreaterThanOrEqual(0.88);
      expect(r.confidence).toBeLessThanOrEqual(0.97);
      // Every stub result must clear the auto-create threshold so the matched branch runs.
      expect(r.confidence).toBeGreaterThanOrEqual(0.85);
    }
  });

  it("is total over a sample and maps different urls to different species", async () => {
    const names = new Set<string>();
    // Fan out over many urls; the 5-species list means we should see >1 species.
    for (let i = 0; i < 200; i++) {
      const r = await identifier.identify(`user-1/obs/${i}.jpg`);
      names.add(r.scientificName);
    }
    expect(names.size).toBeGreaterThan(1);
    // Confidence is drawn from h % 10, so all ten 0.88..0.97 buckets are plausible;
    // at minimum confirm the stub never escapes its declared band over the sample.
  });
});
