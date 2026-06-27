// POST   /api/v1/posts/:id/like — like a post (idempotent).
// DELETE /api/v1/posts/:id/like — unlike a post (idempotent).
// The Like row and Post.likeCount are kept in sync in one transaction so the denormalized
// counter never drifts (same pattern as Profile.totalPoints in the observations pipeline).

import { NextResponse } from "next/server";
import { Prisma } from "@sproutgo/db";
import type { LikeResponse } from "@sproutgo/shared";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { getFriendIds } from "@/lib/friends";
import { assertPostVisible } from "@/lib/posts";

export const dynamic = "force-dynamic";

async function loadVisiblePost(postId: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, userId: true, privacy: true, likeCount: true },
  });
  if (!post) throw errors.notFound("Post not found");
  const friendIds = await getFriendIds(userId);
  assertPostVisible(post, userId, friendIds);
  return post;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const post = await loadVisiblePost(params.id, userId);

    const likeCount = await prisma.$transaction(async (tx) => {
      try {
        await tx.like.create({ data: { userId, postId: post.id } });
      } catch (e) {
        // Already liked — idempotent: return the current count without double-incrementing.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          return post.likeCount;
        }
        throw e;
      }
      const updated = await tx.post.update({
        where: { id: post.id },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      });
      return updated.likeCount;
    });

    const body: LikeResponse = { liked: true, likeCount };
    return NextResponse.json(body);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const post = await loadVisiblePost(params.id, userId);

    const likeCount = await prisma.$transaction(async (tx) => {
      const removed = await tx.like.deleteMany({ where: { userId, postId: post.id } });
      if (removed.count === 0) return post.likeCount; // not liked — idempotent
      const updated = await tx.post.update({
        where: { id: post.id },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      });
      return updated.likeCount;
    });

    const body: LikeResponse = { liked: false, likeCount };
    return NextResponse.json(body);
  } catch (err) {
    return errorResponse(err);
  }
}
