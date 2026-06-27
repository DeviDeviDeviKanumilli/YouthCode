// Referential-integrity tests for the presentational fixtures. The screens render
// straight from these and frequently use non-null assertions (`plantById(id)!`) or
// flat-keyed lookups (settings toggles, friend-by-id) that crash at runtime if a
// fixture drifts. These tests pin those invariants so a bad edit fails in CI, not on
// device. (Pure data only — RN components are covered by currentPlans/TESTING.md.)
import { describe, it, expect } from "vitest";
import {
  plants,
  plantById,
  rarityLabel,
  feedPosts,
  forumCategories,
  forumThread,
  chatMessages,
  chatSuggestions,
  mapMarkers,
  recentDiscoveryIds,
  identifyResult,
  friends,
  friendRequests,
  suggestedFriends,
  settingsSections,
  onboardingSlides,
  plantTypeChips,
  dexProgress,
  profile,
  type Rarity,
} from "./mockData";

const RARITIES = Object.keys(rarityLabel) as Rarity[];
const dupes = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);

describe("plants", () => {
  it("has unique ids", () => {
    expect(dupes(plants.map((p) => p.id))).toEqual([]);
  });

  it("every plant has a labeled rarity and non-empty names", () => {
    for (const p of plants) {
      expect(RARITIES).toContain(p.rarity);
      expect(p.commonName.length).toBeGreaterThan(0);
      expect(p.scientificName.length).toBeGreaterThan(0);
      expect(p.points).toBeGreaterThan(0);
    }
  });

  it("rarityLabel covers exactly the four rarity tiers", () => {
    expect(RARITIES.sort()).toEqual(["COMMON", "LEGENDARY", "RARE", "UNCOMMON"]);
  });
});

describe("plantById", () => {
  it("resolves a known id and returns undefined for an unknown one", () => {
    expect(plantById("monstera")?.id).toBe("monstera");
    expect(plantById("does-not-exist")).toBeUndefined();
  });
});

// These all back `plantById(...)!` non-null assertions in the screens.
describe("plant references resolve (guards non-null assertions)", () => {
  it("feed posts reference real plants and have unique ids", () => {
    expect(dupes(feedPosts.map((p) => p.id))).toEqual([]);
    for (const post of feedPosts) {
      expect(plantById(post.plantId), `feed post ${post.id}`).toBeDefined();
    }
  });

  it("map markers reference real plants, have unique ids and labeled rarity", () => {
    expect(dupes(mapMarkers.map((m) => m.id))).toEqual([]);
    for (const m of mapMarkers) {
      expect(plantById(m.plantId), `marker ${m.id}`).toBeDefined();
      expect(RARITIES).toContain(m.rarity);
    }
  });

  it("recent discovery ids resolve", () => {
    for (const id of recentDiscoveryIds) {
      expect(plantById(id), `recent ${id}`).toBeDefined();
    }
  });

  it("identifyResult references a real plant with a sane confidence/points", () => {
    expect(plantById(identifyResult.plantId)).toBeDefined();
    expect(identifyResult.confidence).toBeGreaterThanOrEqual(0);
    expect(identifyResult.confidence).toBeLessThanOrEqual(1);
    expect(identifyResult.points).toBeGreaterThanOrEqual(0);
  });
});

describe("forums", () => {
  it("categories have unique ids (feed routes to /forums/:id)", () => {
    expect(dupes(forumCategories.map((c) => c.id))).toEqual([]);
  });

  it("thread comments have unique ids", () => {
    expect(dupes(forumThread.comments.map((c) => c.id))).toEqual([]);
  });
});

describe("plant chat", () => {
  it("every message carries text or an image", () => {
    expect(dupes(chatMessages.map((m) => m.id))).toEqual([]);
    for (const m of chatMessages) {
      expect(Boolean(m.text) || Boolean(m.imageUrl), `message ${m.id}`).toBe(true);
    }
  });

  it("offers at least one suggested question", () => {
    expect(chatSuggestions.length).toBeGreaterThan(0);
  });
});

// The friend profile screen looks a friend up by id across the union of all three
// lists, so ids must be globally unique or the lookup is ambiguous.
describe("friends", () => {
  it("ids are unique across friends, requests and suggestions", () => {
    const all = [...friends, ...friendRequests, ...suggestedFriends].map((f) => f.id);
    expect(dupes(all)).toEqual([]);
  });

  it("every friend has an avatar, a username and a non-negative species count", () => {
    for (const f of [...friends, ...friendRequests, ...suggestedFriends]) {
      expect(f.avatarUrl.length).toBeGreaterThan(0);
      expect(f.username.startsWith("@")).toBe(true);
      expect(f.species).toBeGreaterThanOrEqual(0);
    }
  });
});

// The settings screen builds a flat `Record<rowKey, bool>` of toggles and special-cases
// specific keys in onRowPress, so row keys must be globally unique and the wired keys
// must exist.
describe("settings", () => {
  const rows = settingsSections.flatMap((s) => s.rows);

  it("row keys are unique across every section", () => {
    expect(dupes(rows.map((r) => r.key))).toEqual([]);
  });

  it("toggle rows declare a boolean default", () => {
    for (const r of rows.filter((r) => r.kind === "toggle")) {
      expect(typeof r.on, `toggle ${r.key}`).toBe("boolean");
    }
  });

  it("exposes the keys the screen wires explicitly", () => {
    const keys = new Set(rows.map((r) => r.key));
    expect(keys.has("signout")).toBe(true);
    expect(keys.has("edit")).toBe(true);
  });

  it("only sign-out is marked destructive", () => {
    const destructive = rows.filter((r) => r.destructive).map((r) => r.key);
    expect(destructive).toEqual(["signout"]);
  });
});

describe("onboarding", () => {
  it("has unique slide keys and non-empty copy", () => {
    expect(onboardingSlides.length).toBeGreaterThan(0);
    expect(dupes(onboardingSlides.map((s) => s.key))).toEqual([]);
    for (const s of onboardingSlides) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
    }
  });
});

describe("progress fixtures", () => {
  it("plant type chips have unique keys", () => {
    expect(dupes(plantTypeChips.map((c) => c.key))).toEqual([]);
  });

  it("dex progress is bounded", () => {
    expect(dexProgress.discovered).toBeLessThanOrEqual(dexProgress.total);
  });

  it("profile regions have labeled rarity and bounded counts", () => {
    for (const r of profile.regions) {
      expect(RARITIES).toContain(r.rarity);
      expect(r.discovered).toBeLessThanOrEqual(r.total);
    }
  });
});
