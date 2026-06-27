// POST /api/v1/posts   — share a discovery / open a forum thread (API_CONTRACT §social).
// GET  /api/v1/posts   — the feed: scope=feed|friends|forum (+category), offset-paginated.
// Privacy is enforced entirely in the Prisma `where` (R3: service-role Prisma bypasses RLS).

import { NextResponse } from "next/server";
import type { PostsResponse } from "@sproutgo/shared";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errors, errorResponse } from "@/lib/errors";
import { createPostSchema, parsePostsQuery } from "@/lib/validation";
import { serializePost } from "@/lib/serializers";
import { getFriendIds } from "@/lib/friends";
import {
  buildPostsWhere,
  postInclude,
  serializePostsForViewer,
} from "@/lib/posts";
import { trySignImageUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const parsed = createPostSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw errors.validation(parsed.error.issues[0]?.message ?? "Invalid body");
    }
    const data = parsed.data;

    let plantId = data.plantId ?? null;
    let imagePath = data.imagePath ?? null;

    // When posting from an observation, verify it's the caller's and inherit its plant/image —
    // never trust a client to attach someone else's capture.
    if (data.observationId) {
      const obs = await prisma.observation.findUnique({ where: { id: data.observationId } });
      if (!obs || obs.userId !== userId) {
        throw errors.forbidden("That observation is not yours");
      }
      plantId = plantId ?? obs.plantId;
      imagePath = imagePath ?? obs.imagePath;
    }

    const created = await prisma.post.create({
      data: {
        userId,
        observationId: data.observationId ?? null,
        plantId,
        imagePath,
        title: data.title ?? null,
        caption: data.caption ?? null,
        category: data.category ?? null,
        generalLocation: data.generalLocation ?? null,
        privacy: data.privacy,
      },
      include: postInclude,
    });

    const post = serializePost(created, {
      signedImageUrl: await trySignImageUrl(created.imagePath),
      likedByMe: false,
      viewerId: userId,
      viewerIsAdmin: false,
    });
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { userId } = await requireAuth(req);
    const query = parsePostsQuery(new URL(req.url).searchParams);
    if (!query) {
      throw errors.validation("Invalid posts query parameters");
    }
    const { scope, category, limit, offset } = query;

    const [me, friendIds] = await Promise.all([
      prisma.profile.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
      scope === "friends" ? getFriendIds(userId) : Promise.resolve<string[]>([]),
    ]);

    const rows = await prisma.post.findMany({
      where: buildPostsWhere(scope, category, userId, friendIds),
      include: postInclude,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    const posts = await serializePostsForViewer(rows, userId, me?.isAdmin ?? false);
    const body: PostsResponse = { posts, limit, offset };
    return NextResponse.json(body);
  } catch (err) {
    return errorResponse(err);
  }
}
