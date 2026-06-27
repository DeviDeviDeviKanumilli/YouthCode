import { describe, it, expect, vi } from "vitest";
import { isFreeLicense, resolveImage, type ImageCache } from "./wikimedia";

// resolveImage only runs in seed:scrape; here we exercise the license gate + cache behavior
// with an injected fetch so there's no network.

describe("isFreeLicense", () => {
  it("accepts PD / CC0 / CC-BY / CC-BY-SA", () => {
    expect(isFreeLicense("Public domain")).toBe(true);
    expect(isFreeLicense("CC0")).toBe(true);
    expect(isFreeLicense("CC BY 4.0")).toBe(true);
    expect(isFreeLicense("CC BY-SA 3.0")).toBe(true);
  });

  it("rejects non-free / unknown licenses", () => {
    expect(isFreeLicense("CC BY-NC 4.0")).toBe(false);
    expect(isFreeLicense("All rights reserved")).toBe(false);
    expect(isFreeLicense(null)).toBe(false);
    expect(isFreeLicense(undefined)).toBe(false);
  });
});

const now = () => "2026-05-30T00:00:00.000Z";

describe("resolveImage", () => {
  it("returns a cached non-miss without calling fetch", async () => {
    const cache: ImageCache = {
      "Acer rubrum": {
        imageUrl: "https://example.com/a.jpg",
        imageLicense: "CC BY-SA 4.0",
        imageAttribution: "Someone",
        imageSourceUrl: "https://commons.example/File:a.jpg",
        miss: false,
        resolvedAt: now(),
      },
    };
    const fetchFn = vi.fn();
    const out = await resolveImage("Acer rubrum", cache, fetchFn as never, now);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(out.imageUrl).toBe("https://example.com/a.jpg");
  });

  it("returns empty + records a miss when nothing resolves", async () => {
    const cache: ImageCache = {};
    // All endpoints return empty JSON → no Wikidata entity, no Commons search hit.
    const fetchFn = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    const out = await resolveImage("Obscura nonexistentia", cache, fetchFn as never, now);
    expect(out.imageUrl).toBeNull();
    expect(cache["Obscura nonexistentia"]?.miss).toBe(true);
    expect(cache["Obscura nonexistentia"]?.resolvedAt).toBe(now());
  });

  it("does not re-query a cached miss", async () => {
    const cache: ImageCache = {
      "Obscura nonexistentia": {
        imageUrl: null,
        imageLicense: null,
        imageAttribution: null,
        imageSourceUrl: null,
        miss: true,
        resolvedAt: now(),
      },
    };
    const fetchFn = vi.fn();
    const out = await resolveImage("Obscura nonexistentia", cache, fetchFn as never, now);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(out.imageUrl).toBeNull();
  });
});
