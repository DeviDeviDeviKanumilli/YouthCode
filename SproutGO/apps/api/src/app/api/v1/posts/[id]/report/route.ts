// POST /api/v1/posts/:id/report — flag a post for moderation (API_CONTRACT §social).
// Persists a Report row (moderation trail for admins) and returns 204. A user can't report
// their own post; duplicate reports from the same user are collapsed (idempotent).

import { NextResponse } from "next/server";
import { Prisma } from "@sproutgo/db";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { reportSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const parsed = reportSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw errors.validation(parsed.error.issues[0]?.message ?? "Invalid body");
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });
    if (!post) throw errors.notFound("Post not found");
    if (post.userId === userId) {
      throw errors.validation("You can't report your own post");
    }

    try {
      await prisma.report.create({
        data: { reporterId: userId, postId: params.id, reason: parsed.data.reason },
      });
    } catch (e) {
      // A unique (reporter, post) collision would be idempotent; there's no such constraint
      // today, so only swallow the known case and rethrow anything else.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) {
        throw e;
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
