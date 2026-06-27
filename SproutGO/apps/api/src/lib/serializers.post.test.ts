import { describe, it, expect } from "vitest";
import { serializePost, serializeComment } from "./serializers";

// serializePost/serializeComment are pure: viewer-relative flags (likedByMe/isOwn/canDelete)
// and the signed image URL are passed in by the route. We feed plain literals shaped like the
// Prisma rows.

function profile(over: Record<string, unknown> = {}) {
  return {
    id: "u1",
    username: "ada",
    avatarUrl: "https://x/a.jpg",
    bio: "botanist",
    dateOfBirth: null,
    totalPoints: 0,
    isAdmin: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
  };
}

function postRow(over: Record<string, unknown> = {}) {
  return {
    id: "post-1",
    userId: "u1",
    observationId: null,
    plantId: null,
    imagePath: "u1/obs/a.jpg",
    title: null,
    caption: "what a find",
    category: null,
    generalLocation: null,
    privacy: "PUBLIC",
    likeCount: 3,
    commentCount: 1,
    createdAt: new Date("2026-02-02T12:00:00.000Z"),
    user: profile(),
    plant: null,
    ...over,
  };
}

describe("serializePost", () => {
  it("embeds the author, signed image url, and viewer flags", () => {
    const post = serializePost(postRow() as never, {
      signedImageUrl: "https://signed/a.jpg",
      likedByMe: true,
      viewerId: "u1",
      viewerIsAdmin: false,
    });
    expect(post.author).toEqual({ id: "u1", username: "ada", avatarUrl: "https://x/a.jpg", bio: "botanist" });
    expect(post.imageUrl).toBe("https://signed/a.jpg");
    expect(post.likedByMe).toBe(true);
    expect(post.isOwn).toBe(true);
    expect(post.canDelete).toBe(true); // owner
    expect(post.createdAt).toBe("2026-02-02T12:00:00.000Z");
  });

  it("non-owner can't delete unless admin", () => {
    const asStranger = serializePost(postRow() as never, {
      signedImageUrl: null,
      likedByMe: false,
      viewerId: "other",
      viewerIsAdmin: false,
    });
    expect(asStranger.isOwn).toBe(false);
    expect(asStranger.canDelete).toBe(false);

    const asAdmin = serializePost(postRow() as never, {
      signedImageUrl: null,
      likedByMe: false,
      viewerId: "other",
      viewerIsAdmin: true,
    });
    expect(asAdmin.canDelete).toBe(true);
  });

  it("embeds the lean plant subset when present", () => {
    const post = serializePost(
      postRow({
        plantId: "p1",
        plant: {
          id: "p1",
          scientificName: "Acer rubrum",
          commonName: "Red Maple",
          rarity: "COMMON",
          imageUrl: "https://x/p.jpg",
        },
      }) as never,
      { signedImageUrl: null, likedByMe: false, viewerId: "u1", viewerIsAdmin: false },
    );
    expect(post.plant).toEqual({
      id: "p1",
      commonName: "Red Maple",
      scientificName: "Acer rubrum",
      rarity: "COMMON",
      imageUrl: "https://x/p.jpg",
    });
  });
});

describe("serializeComment", () => {
  it("maps author + body + iso createdAt", () => {
    const c = serializeComment({
      id: "c1",
      postId: "post-1",
      userId: "u1",
      body: "agreed",
      createdAt: new Date("2026-03-03T03:03:03.000Z"),
      user: profile(),
    } as never);
    expect(c).toEqual({
      id: "c1",
      postId: "post-1",
      author: { id: "u1", username: "ada", avatarUrl: "https://x/a.jpg", bio: "botanist" },
      body: "agreed",
      createdAt: "2026-03-03T03:03:03.000Z",
    });
  });
});
