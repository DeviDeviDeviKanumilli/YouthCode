import { describe, it, expect } from "vitest";
import { Privacy } from "@sproutgo/db";
import { buildPostsWhere, canViewPost } from "./posts";

const VIEWER = "viewer";
const FRIEND = "friend";
const STRANGER = "stranger";
const friends = [FRIEND];

describe("buildPostsWhere", () => {
  it("feed = everyone's PUBLIC + the caller's own", () => {
    expect(buildPostsWhere("feed", undefined, VIEWER, [])).toEqual({
      OR: [{ privacy: Privacy.PUBLIC }, { userId: VIEWER }],
    });
  });

  it("friends = own + PUBLIC/FRIENDS from accepted friends", () => {
    expect(buildPostsWhere("friends", undefined, VIEWER, friends)).toEqual({
      OR: [
        { userId: VIEWER },
        { userId: { in: friends }, privacy: { in: [Privacy.PUBLIC, Privacy.FRIENDS] } },
      ],
    });
  });

  it("forum = PUBLIC with a category (any, or a specific one)", () => {
    expect(buildPostsWhere("forum", undefined, VIEWER, [])).toEqual({
      privacy: Privacy.PUBLIC,
      category: { not: null },
    });
    expect(buildPostsWhere("forum", "PLANT_ID", VIEWER, [])).toEqual({
      privacy: Privacy.PUBLIC,
      category: "PLANT_ID",
    });
  });
});

describe("canViewPost", () => {
  it("owner sees their own post at any privacy", () => {
    expect(canViewPost({ userId: VIEWER, privacy: Privacy.PRIVATE }, VIEWER, friends)).toBe(true);
  });
  it("anyone sees PUBLIC", () => {
    expect(canViewPost({ userId: STRANGER, privacy: Privacy.PUBLIC }, VIEWER, friends)).toBe(true);
  });
  it("a friend sees FRIENDS; a stranger does not", () => {
    expect(canViewPost({ userId: FRIEND, privacy: Privacy.FRIENDS }, VIEWER, friends)).toBe(true);
    expect(canViewPost({ userId: STRANGER, privacy: Privacy.FRIENDS }, VIEWER, friends)).toBe(false);
  });
  it("a stranger's PRIVATE post is hidden", () => {
    expect(canViewPost({ userId: STRANGER, privacy: Privacy.PRIVATE }, VIEWER, friends)).toBe(false);
  });
});
