// Shared helpers for the post/feed routes: building the privacy-aware scope filter, batch-
// serializing posts for a viewer (one Like lookup + signed image URLs), and a visibility gate.

import { Prisma, Privacy } from "@sproutgo/db";
import type { Post as PostRow, Profile as ProfileRow, Plant as PlantRow } from "@sproutgo/db";
import type { Post } from "@sproutgo/shared";
import { prisma } from "@/lib/prisma";
import { serializePost } from "@/lib/serializers";
import { trySignImageUrl } from "@/lib/storage";
import { errors } from "@/lib/errors";
import type { PostsScope } from "@/lib/validation";

export type PostRowWithRelations = PostRow & { user: ProfileRow; plant: PlantRow | null };
export const postInclude = { user: true, plant: true } as const;

// The Prisma `where` for a feed scope (privacy enforced server-side; Prisma bypasses RLS):
//  - feed:    everyone's PUBLIC posts + the caller's own
//  - friends: the caller's own + PUBLIC/FRIENDS posts from accepted friends
//  - forum:   PUBLIC posts that have a category (optionally a specific one)
export function buildPostsWhere(
  scope: PostsScope,
  category: string | undefined,
  viewerId: string,
  friendIds: string[],
): Prisma.PostWhereInput {
  if (scope === "forum") {
    return { privacy: Privacy.PUBLIC, category: category ?? { not: null } };
  }
  if (scope === "friends") {
    return {
      OR: [
        { userId: viewerId },
        { userId: { in: friendIds }, privacy: { in: [Privacy.PUBLIC, Privacy.FRIENDS] } },
      ],
    };
  }
  // feed
  return { OR: [{ privacy: Privacy.PUBLIC }, { userId: viewerId }] };
}

// True if the caller may see this single post (used by detail / like / comment routes).
export function canViewPost(
  post: { userId: string; privacy: Privacy },
  viewerId: string,
  friendIds: string[],
): boolean {
  if (post.userId === viewerId) return true;
  if (post.privacy === Privacy.PUBLIC) return true;
  if (post.privacy === Privacy.FRIENDS && friendIds.includes(post.userId)) return true;
  return false;
}

export function assertPostVisible(
  post: { userId: string; privacy: Privacy },
  viewerId: string,
  friendIds: string[],
): void {
  if (!canViewPost(post, viewerId, friendIds)) {
    // Don't reveal existence of posts the caller can't see.
    throw errors.notFound("Post not found");
  }
}

// Serialize a page of posts for one viewer: a single Like lookup over the page + best-effort
// signed image URLs (a missing image never breaks the page).
export async function serializePostsForViewer(
  rows: PostRowWithRelations[],
  viewerId: string,
  viewerIsAdmin: boolean,
): Promise<Post[]> {
  if (rows.length === 0) return [];
  const liked = await prisma.like.findMany({
    where: { userId: viewerId, postId: { in: rows.map((r) => r.id) } },
    select: { postId: true },
  });
  const likedSet = new Set(liked.map((l) => l.postId));
  return Promise.all(
    rows.map(async (row) =>
      serializePost(row, {
        signedImageUrl: await trySignImageUrl(row.imagePath),
        likedByMe: likedSet.has(row.id),
        viewerId,
        viewerIsAdmin,
      }),
    ),
  );
}
