// GET    /api/v1/posts/:id — a post + its comments (a forum "thread" is a category post here).
// DELETE /api/v1/posts/:id — owner OR admin (the moderation delete path; first isAdmin use).

import { NextResponse } from "next/server";
import type { PostDetailResponse } from "@sproutgo/shared";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { serializeComment, serializePost } from "@/lib/serializers";
import { getFriendIds } from "@/lib/friends";
import { assertPostVisible, postInclude } from "@/lib/posts";
import { trySignImageUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MAX_COMMENTS = 200;

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: postInclude,
    });
    if (!post) throw errors.notFound("Post not found");

    const [friendIds, me] = await Promise.all([
      getFriendIds(userId),
      prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
    ]);
    assertPostVisible(post, userId, friendIds);

    const [signedImageUrl, likedByMe, commentRows] = await Promise.all([
      trySignImageUrl(post.imagePath),
      prisma.like
        .findUnique({ where: { userId_postId: { userId, postId: post.id } }, select: { id: true } })
        .then((l) => l != null),
      prisma.comment.findMany({
        where: { postId: post.id },
        include: { user: true },
        orderBy: { createdAt: "asc" },
        take: MAX_COMMENTS,
      }),
    ]);

    const body: PostDetailResponse = {
      post: serializePost(post, {
        signedImageUrl,
        likedByMe,
        viewerId: userId,
        viewerIsAdmin: me?.isAdmin ?? false,
      }),
      comments: commentRows.map(serializeComment),
    };
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

    const [post, me] = await Promise.all([
      prisma.post.findUnique({ where: { id: params.id }, select: { userId: true } }),
      prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
    ]);
    if (!post) throw errors.notFound("Post not found");
    if (post.userId !== userId && !me?.isAdmin) {
      throw errors.forbidden("You can only delete your own posts");
    }

    // Cascades to likes/comments/reports via onDelete: Cascade.
    await prisma.post.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
