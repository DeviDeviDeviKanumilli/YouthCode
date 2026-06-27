import { describe, it, expect } from "vitest";
import {
  parsePostsQuery,
  createPostSchema,
  createCommentSchema,
  reportSchema,
  friendRequestSchema,
  friendRequestActionSchema,
  userSearchSchema,
  chatMessageSchema,
  POSTS_PAGE_DEFAULT,
  POSTS_PAGE_MAX,
} from "./validation";

const params = (o: Record<string, string>) => new URLSearchParams(o);

describe("parsePostsQuery", () => {
  it("defaults scope=feed with pagination", () => {
    expect(parsePostsQuery(params({}))).toEqual({
      scope: "feed",
      limit: POSTS_PAGE_DEFAULT,
      offset: 0,
    });
  });

  it("parses scope + category + pagination", () => {
    expect(parsePostsQuery(params({ scope: "forum", category: "PLANT_ID", limit: "10", offset: "5" }))).toEqual({
      scope: "forum",
      category: "PLANT_ID",
      limit: 10,
      offset: 5,
    });
  });

  it("drops blank params and rejects bad enums / limits", () => {
    expect(parsePostsQuery(params({ category: "" }))?.scope).toBe("feed");
    expect(parsePostsQuery(params({ scope: "everything" }))).toBeNull();
    expect(parsePostsQuery(params({ category: "OFFTOPIC" }))).toBeNull();
    expect(parsePostsQuery(params({ limit: String(POSTS_PAGE_MAX + 1) }))).toBeNull();
    expect(parsePostsQuery(params({ offset: "-1" }))).toBeNull();
  });
});

describe("createPostSchema", () => {
  it("requires at least one of observation/plant/caption/title", () => {
    expect(createPostSchema.safeParse({}).success).toBe(false);
    expect(createPostSchema.safeParse({ caption: "hi" }).success).toBe(true);
  });

  it("defaults privacy to PUBLIC and accepts a forum category", () => {
    const r = createPostSchema.safeParse({ caption: "x", category: "RARE_FINDS" });
    expect(r.success && r.data.privacy).toBe("PUBLIC");
  });

  it("rejects a traversal imagePath", () => {
    expect(createPostSchema.safeParse({ caption: "x", imagePath: "../etc/passwd" }).success).toBe(false);
  });
});

describe("comment / report / friend schemas", () => {
  it("comment body must be non-empty and bounded", () => {
    expect(createCommentSchema.safeParse({ body: "" }).success).toBe(false);
    expect(createCommentSchema.safeParse({ body: "nice find!" }).success).toBe(true);
  });

  it("report requires a reason", () => {
    expect(reportSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(reportSchema.safeParse({ reason: "spam" }).success).toBe(true);
  });

  it("friend request needs a uuid receiver; action is accept|reject", () => {
    expect(friendRequestSchema.safeParse({ receiverId: "not-a-uuid" }).success).toBe(false);
    expect(friendRequestSchema.safeParse({ receiverId: "11111111-1111-1111-1111-111111111111" }).success).toBe(true);
    expect(friendRequestActionSchema.safeParse({ action: "accept" }).success).toBe(true);
    expect(friendRequestActionSchema.safeParse({ action: "maybe" }).success).toBe(false);
  });

  it("user search requires a non-empty query", () => {
    expect(userSearchSchema.safeParse({ q: "" }).success).toBe(false);
    expect(userSearchSchema.safeParse({ q: "ada" }).success).toBe(true);
  });

  it("chat message must be non-empty and bounded", () => {
    expect(chatMessageSchema.safeParse({ message: "" }).success).toBe(false);
    expect(chatMessageSchema.safeParse({ message: "hello!" }).success).toBe(true);
    expect(chatMessageSchema.safeParse({ message: "x".repeat(1001) }).success).toBe(false);
  });
});
