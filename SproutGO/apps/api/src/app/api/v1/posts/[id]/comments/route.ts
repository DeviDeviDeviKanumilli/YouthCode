// POST /api/v1/posts/:id/comments — add a comment (API_CONTRACT §social). The Comment row and
// Post.commentCount are written together in one transaction so the counter stays in sync.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { createCommentSchema } from "@/lib/validation";
import { serializeComment } from "@/lib/serializers";
import { getFriendIds } from "@/lib/friends";
import { assertPostVisible } from "@/lib/posts";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const parsed = createCommentSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw errors.validation(parsed.error.issues[0]?.message ?? "Invalid body");
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, privacy: true },
    });
    if (!post) throw errors.notFound("Post not found");
    const friendIds = await getFriendIds(userId);
    assertPostVisible(post, userId, friendIds);

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: { postId: post.id, userId, body: parsed.data.body },
        include: { user: true },
      });
      await tx.post.update({
        where: { id: post.id },
        data: { commentCount: { increment: 1 } },
      });
      return created;
    });

    return NextResponse.json(serializeComment(comment), { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
